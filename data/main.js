var SipuViewer = (function (SipuViewer, undefined) {
    "use strict";
    /***
     * Import Ext function
     */
    function loadJSON(path, success, error) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (success)
                        success(JSON.parse(xhr.responseText));
                } else {
                    if (error)
                        error(xhr);
                }
            }
        };
        xhr.open("GET", path, true);
        xhr.send();
    }
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /***
     * Init Enviroment
     */
    SipuViewer.init = {
        VER: "1.0",
        canvasID: "main_canvas",
        fps: 60
    };
    /***
     * Init Object 
     */
    var BGSTATE = {
        Day: 1,
        Night: 2
    };
    var BG = {
        BgColor: "black",
        GroundColor: "green",
        Path: { x: 200, y: 400 },
        SetPath: { x: 600, y: 400 },
        BgPicSize: 18,
        BgPicHarfSize: 9,
        BgPicChangeSize: 600,
        BgOutPic: [],
        BgPic: [],
        BgPos: []
    };
    BG.SetBgPic = function () {
        var len = BG.BgPic.length;
        BG.BgPos = Array.apply(null, Array(len))
            .map(a => [getRandomInt(0, 800), getRandomInt(300, 380), BG.BgPicSize]);
    };
    var OBBG = {

    }

    var USERSTATE = {
        Walk: 1,
        Rest: 2,
        Turn: 3
    };
    var USER = {
        Target: -1,
        TimeSet: new Date(),
        State: USERSTATE.Turn,
        Energy: 100
    };

    var Canvas = {
        obj: document.getElementById(SipuViewer.init.canvasID)
    };
    /***
     * Canvas Walking Part
     */
    Canvas.init = function () {
        //init def
        Canvas.ctx = Canvas.obj.getContext("2d");
        Canvas.bound = Canvas.obj.getBoundingClientRect();
        //init event
        var rc = _.debounce(routeChange, 1000);
        Canvas.obj.addEventListener("click", rc, false);
    };

    Canvas.update = function () {
        var dt = arguments[0];
        fetchBg(dt);
        //fetchBgObj(dt);
        fetchPath(dt);
        fetchTarget(USER.Target);
    };

    Canvas.draw = function () {
        //need draw center
        var dt = arguments[0];
        drawBg();
        //drawBgObj();
        drawPath();
        drawBgPic();
        drawBgOutPic();
    };
    /***
     *  Sub Function obj draw & obj fetch 
     */
    function CanvasLoop(drawobj) {
        var dt = 1 / SipuViewer.init.fps;
        Canvas.update(dt);
        Canvas.draw(dt, drawobj.ctx);
    }

    function routeChange(e) {
        var clk_X = e.clientX - Canvas.bound.left;
        var clk_Y = e.clientY - Canvas.bound.top;
        var chkidx = -1;
        BG.BgPos.map((a, i) => {
            if (a[0] - BG.BgPicHarfSize < clk_X
                && a[0] + BG.BgPicHarfSize > clk_X
                && a[1] - BG.BgPicSize < clk_Y
                && a[1] > clk_Y
            ) {
                chkidx = i;
            }
        });
        if (chkidx !== -1) {
            userChangeTarget(chkidx, clk_X, clk_Y);
        }
    }

    function userChangeTarget(idx, x, y) {
        if (idx === -1) { USER.Target = -1; return; }
        if (USER.Target !== idx) {
            USER.TimeSet = new Date();
            var tempPos = BG.BgPos[idx];
            BG.BgPos.splice(idx, 1);
            BG.BgPos.push(tempPos);
            USER.Target = BG.BgPos.length - 1;
            BG.SetPath.x = x;
            BG.SetPath.y = y;
            console.log(USER.TimeSet, idx);
        }
    }

    function fetchBg(dt) {
        if (USER.State !== USERSTATE.Walk) { return; }
        var oneStep = dt * 1;
        if (399 > BG.Path.x) {
            BG.BgPos = BG.BgPos.map(a => {
                a[0] += oneStep;
                if (a[0] > 800) {
                    a[0] -= 800;
                }
                return a;
            });
            BG.Path.x += oneStep;
            BG.SetPath.x += oneStep;
        }
        if (400 < BG.Path.x) {
            BG.BgPos.map(a => {
                a[0] -= oneStep;
                if (a[0] < 0) {
                    a[0] += 800;
                }
            });
            BG.Path.x -= oneStep;
            BG.SetPath.x -= oneStep;
        }
    }

    function fetchTarget(idx) {
        if (idx === -1 || idx == undefined) { return; }
        //onUser Not Walking Stop
        if (USER.State !== USERSTATE.Walk) { return; }

        var timespan = new Date().getTime() - USER.TimeSet.getTime();
        if (BG.BgPos[idx][2] > BG.BgPicChangeSize * 0.5) {
            //bigger image Set
        }
        //fetch size & position
        BG.BgPos[idx][2] = BG.BgPicSize + (timespan / 10000);
        if (BG.BgPos[idx][1] - BG.BgPos[idx][2] < 0) {
            BG.BgPos[idx][1] += 0.7;
        } 
        //fetch other
        BG.BgPos.map((a, i) => {
            if (a[2] > BG.BgPicSize && i < BG.BgPos.length - 1) {
                BG.BgPos[i][2] -= 0.7;
                if (BG.BgPos[i][2] < BG.BgPicSize) {
                    BG.BgPos[i][2] = BG.BgPicSize;
                }
            }
        });
		//remover
        if (BG.BgPos[idx][2] > BG.BgPicChangeSize) {
            userChangeTarget(-1, BG.SetPath.x, BG.SetPath.y);
            var outP = BG.BgPic.pop();
            var outPos = BG.BgPos.pop();
            BG.BgOutPic = [outP, outPos.slice(0)];
            USER.Target = -1;
        }
    }

    function fetchPath(dt) {
        var oneStep = dt * 20;
        var onside = BG.Path.x || 0;
        var goal = BG.SetPath.x || 0;
        var gap = Math.abs(onside - goal);
        if (gap > 1) {
            //on Turn
            if (USER.State !== USERSTATE.Turn) { USER.State = USERSTATE.Turn; }
            if (oneStep < gap) {
                BG.Path.x = onside > goal ? onside - oneStep : onside + oneStep;
            } else {
                BG.Path.x = onside > goal ? onside - gap : onside + gap;
            }
        } else {
            //turn complete
            if (USER.State !== USERSTATE.Walk) { USER.State = USERSTATE.Walk; }

        }
    }

    function drawBg() {

        var grdSky = Canvas.ctx.createLinearGradient(0, 0, 0, 400);
        grdSky.addColorStop(0, "#59a6e0");
        grdSky.addColorStop(1, "#a7d0ef");
        Canvas.ctx.fillStyle = grdSky;
        Canvas.ctx.fillRect(0, 0, 800, 400);

        var grdLand = Canvas.ctx.createLinearGradient(0, 400, 0, 600);
        grdLand.addColorStop(0, "#b3d3a0");
        grdLand.addColorStop(1, "#79ba53");
        Canvas.ctx.fillStyle = grdLand;
        Canvas.ctx.fillRect(0, 400, 800, 600);
    }

    function drawPath() {
        var cpy1 = 450;
        var cpy2 = 550;
        var cpx11 = 200;
        var cpx12 = 200;
        var cpx21 = 350;
        var cpx22 = 400;

        var grd = Canvas.ctx.createLinearGradient(0, 400, 0, 600);
        grd.addColorStop(0, "#bfb5a8");
        grd.addColorStop(1, "#5b3714");

        Canvas.ctx.beginPath();
        Canvas.ctx.strokeStyle = "#5b3714";
        Canvas.ctx.moveTo(BG.Path.x, 400);
        Canvas.ctx.bezierCurveTo(cpx11, cpy1, cpx12, cpy2, 200, 600);
        Canvas.ctx.lineTo(600, 600);
        Canvas.ctx.bezierCurveTo(cpx22, cpy2, cpx21, cpy1, BG.Path.x, 400);
        Canvas.ctx.closePath();
        Canvas.ctx.fillStyle = grd;
        Canvas.ctx.fill();
    }

    function drawBgPic() {
        BG.BgPos.map((a, i) => {
            if (a[2] === BG.BgPicSize) {
                Canvas.ctx.drawImage(BG.BgPic[i], (a[0] - BG.BgPicHarfSize), (a[1] - BG.BgPicSize));
            } else {
                Canvas.ctx.drawImage(BG.BgPic[i], (a[0] - (a[2] * 0.5)), (a[1] - a[2]), a[2], a[2]);
            }
        });
    }

    function drawBgOutPic() {
        if (BG.BgOutPic.length === 0) { return; }
        if (BG.BgOutPic[1][1] < 1) { BG.BgOutPic = []; return; }
        Canvas.ctx.drawImage(
            BG.BgOutPic[0],
            (BG.BgOutPic[1][0] - (BG.BgOutPic[1][2] * 0.5)),
            (BG.BgOutPic[1][1] - BG.BgOutPic[1][2]),
            BG.BgOutPic[1][2], BG.BgOutPic[1][2]
        );
        BG.BgOutPic[1][1] -= 1;
    }

    function LoadData() {
        loadJSON('/data/data.json',
            function (data) {
                //BG.BgPic = data.Pic;
                data.Pic.map((a, i) => {
                    BG.BgPic.push(new Image());
                    BG.BgPic[i].src = 'data:image/png;base64,' + a;
                });
                BG.SetBgPic();
                return initData();
            },
            function (xhr) { console.error(xhr); }
        );

    }

    function initData() {
        Canvas.init();
        SipuViewer.intervalId = setInterval(function () {
            CanvasLoop(Canvas);
        }, 1000 / SipuViewer.init.fps);
    }

    SipuViewer.main = function () {
        LoadData();
    };
    return SipuViewer;
})(window.SipuViewer || {});
SipuViewer.main();
