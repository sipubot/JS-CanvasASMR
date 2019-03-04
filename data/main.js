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
    function rgbToHex(rgb) {
        var hex = rgb.map(a => a.toString(16).length == 1 ? "0" + a.toString(16) : a.toString(16));
        return "#" + hex.join('');
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
        DAY: 1,
        NIGHT: 2,
        MORNING: 3,
        EVENING: 4
    };
    var COLOR = {
        AIR: [11, 3, 32],
        AIROPACITY: 0.7,
        SKY: { TOP: [], BOTTOM: [] },
        LAND: { TOP: [], BOTTOM: [] }
    };
    var OBJMOD = {
        Path: { x: 400, y: 400 },
        PathSet: { x: 400, y: 400 },
        Pic: [],
        Pos: [],
        PicSize: 18,
        PicHarfSize: 9,
        PicChangeSize: 600,
        PicOut: []
    };
    OBJMOD.SetBgPic = function () {
        var len = OBJMOD.Pic.length;
        OBJMOD.Pos = Array.apply(null, Array(len))
            .map(a => [getRandomInt(0, 800), getRandomInt(300, 380), OBJMOD.PicSize]);
    };
    var OBJBG = {
        OBJLIST: ["MOUNTAIN2", "CLOUD", "MOON", "STAR", "STONE_A", "STONE_B"],
        CPT: {},
        PIC: {},
        POS: {}
    };
    OBJBG.SetBgObjPos = function () {
        OBJBG.POS["MOUNTAIN2"] = [400, 0];
        OBJBG.CPT["CLOUD"] = 10;
        OBJBG.POS["CLOUD"] = Array.apply(null, Array(OBJBG.CPT["CLOUD"]))
            .map(a => [getRandomInt(0, 800), getRandomInt(20, 150), getRandomInt(30, 50)]);
    };
    var OBJITEM = {
        OBJLIST: ["APPLE", "BUTTERFLY", "CARROT", "STRAWBERRY", "LIKE"],
        PIC: {}
    };

    var USERSTATE = {
        Walk: 1,
        Rest: 2,
        Turn: 3
    };
    var USER = {
        Target: -1,
        TimeSet: new Date(),
        State: USERSTATE.Walk,
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
        fetchPath(dt);
        fetchBgObj(dt);
        fetchTarget(USER.Target);
    };

    Canvas.draw = function () {
        //need draw center
        var dt = arguments[0];
        drawBg();
        drawPath();
        drawBgObj();
        drawBgPic();
        drawBgPicOut();
        drawAllTimeColor();
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
        OBJMOD.Pos.map((a, i) => {
            if (a[0] - OBJMOD.PicHarfSize < clk_X
                && a[0] + OBJMOD.PicHarfSize > clk_X
                && a[1] - OBJMOD.PicSize < clk_Y
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
            var tempPos = OBJMOD.Pos[idx];
            OBJMOD.Pos.splice(idx, 1);
            OBJMOD.Pos.push(tempPos);
            USER.Target = OBJMOD.Pos.length - 1;
            OBJMOD.PathSet.x = x;
            OBJMOD.PathSet.y = y;
            console.log(USER.TimeSet, idx);
        }
    }

    function fetchBg(dt) {
        if (USER.State !== USERSTATE.Walk) { return; }
        var oneStep = dt * 1;
        if (399 > OBJMOD.Path.x) {
            OBJMOD.Pos = OBJMOD.Pos.map(a => {
                a[0] += oneStep;
                if (a[0] > 800) {
                    a[0] -= 800;
                }
                return a;
            });
            OBJMOD.Path.x += oneStep;
            OBJMOD.PathSet.x += oneStep;
        }
        if (400 < OBJMOD.Path.x) {
            OBJMOD.Pos.map(a => {
                a[0] -= oneStep;
                if (a[0] < 0) {
                    a[0] += 800;
                }
            });
            OBJMOD.Path.x -= oneStep;
            OBJMOD.PathSet.x -= oneStep;
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

    function fetchTarget(idx) {
        if (idx === -1 || idx == undefined) { return; }
        //onUser Not Walking Stop
        if (USER.State !== USERSTATE.Walk) { return; }

        var timespan = new Date().getTime() - USER.TimeSet.getTime();
        if (OBJMOD.Pos[idx][2] > OBJMOD.PicChangeSize * 0.5) {
            //bigger image Set
        }
        //fetch size & position
        OBJMOD.Pos[idx][2] = OBJMOD.PicSize + (timespan / 10000);
        if (OBJMOD.Pos[idx][1] - OBJMOD.Pos[idx][2] < 0) {
            OBJMOD.Pos[idx][1] += 0.7;
        }
        //fetch other
        OBJMOD.Pos.map((a, i) => {
            if (a[2] > OBJMOD.PicSize && i < OBJMOD.Pos.length - 1) {
                OBJMOD.Pos[i][2] -= 0.7;
                if (OBJMOD.Pos[i][2] < OBJMOD.PicSize) {
                    OBJMOD.Pos[i][2] = OBJMOD.PicSize;
                }
            }
        });
        //remover
        if (OBJMOD.Pos[idx][2] > OBJMOD.PicChangeSize) {
            userChangeTarget(-1, OBJMOD.PathSet.x, OBJMOD.PathSet.y);
            var outP = OBJMOD.Pic.pop();
            var outPos = OBJMOD.Pos.pop();
            OBJMOD.PicOut = [outP, outPos.slice(0)];
            USER.Target = -1;
        }
    }

    function drawBgPic() {
        OBJMOD.Pos.map((a, i) => {
            if (a[2] === OBJMOD.PicSize) {
                Canvas.ctx.drawImage(OBJMOD.Pic[i], (a[0] - OBJMOD.PicHarfSize), (a[1] - OBJMOD.PicSize));
            } else {
                Canvas.ctx.drawImage(OBJMOD.Pic[i], (a[0] - (a[2] * 0.5)), (a[1] - a[2]), a[2], a[2]);
            }
        });
    }

    function drawBgPicOut() {
        if (OBJMOD.PicOut.length === 0) { return; }
        if (OBJMOD.PicOut[1][1] < 1) { OBJMOD.PicOut = []; return; }
        Canvas.ctx.drawImage(
            OBJMOD.PicOut[0],
            (OBJMOD.PicOut[1][0] - (OBJMOD.PicOut[1][2] * 0.5)),
            (OBJMOD.PicOut[1][1] - OBJMOD.PicOut[1][2]),
            OBJMOD.PicOut[1][2], OBJMOD.PicOut[1][2]
        );
        OBJMOD.PicOut[1][1] -= 1;
    }

    function fetchPath(dt) {
        var oneStep = dt * 20;
        var onside = OBJMOD.Path.x || 0;
        var goal = OBJMOD.PathSet.x || 0;
        var gap = Math.abs(onside - goal);
        if (gap > 1) {
            //on Turn
            if (USER.State !== USERSTATE.Turn) { USER.State = USERSTATE.Turn; }
            if (oneStep < gap) {
                OBJMOD.Path.x = onside > goal ? onside - oneStep : onside + oneStep;
            } else {
                OBJMOD.Path.x = onside > goal ? onside - gap : onside + gap;
            }
        } else {
            //turn complete
            if (USER.State !== USERSTATE.Walk) { USER.State = USERSTATE.Walk; }

        }
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
        Canvas.ctx.moveTo(OBJMOD.Path.x, 400);
        Canvas.ctx.bezierCurveTo(cpx11, cpy1, cpx12, cpy2, 200, 600);
        Canvas.ctx.lineTo(600, 600);
        Canvas.ctx.bezierCurveTo(cpx22, cpy2, cpx21, cpy1, OBJMOD.Path.x, 400);
        Canvas.ctx.closePath();
        Canvas.ctx.fillStyle = grd;
        Canvas.ctx.fill();
    }

    function fetchBgObj(dt) {
        if (USER.State !== USERSTATE.Walk) { return; }
        var oneStep = dt * 1;
        if (399 > OBJMOD.Path.x) {
            OBJBG.POS["MOUNTAIN2"][0] += oneStep;
            OBJBG.POS["CLOUD"].map((a, i) => {
                OBJBG.POS["CLOUD"][i][0] += oneStep;
            });
        }
        if (400 < OBJMOD.Path.x) {
            OBJBG.POS["MOUNTAIN2"][0] -= oneStep;
            OBJBG.POS["CLOUD"].map((a, i) => {
                OBJBG.POS["CLOUD"][i][0] -= oneStep;
            });
        }
        /***
         * 좌우 화면 연결
         */
        OBJBG.POS["MOUNTAIN2"][0] = OBJBG.POS["MOUNTAIN2"][0] > 800 ? OBJBG.POS["MOUNTAIN2"][0] % 800 : OBJBG.POS["MOUNTAIN2"][0];
        OBJBG.POS["MOUNTAIN2"][0] = OBJBG.POS["MOUNTAIN2"][0] < 0 ? OBJBG.POS["MOUNTAIN2"][0] + 800 : OBJBG.POS["MOUNTAIN2"][0];
        /***
         * 추가적인 움직임 설정
         */

        OBJBG.POS["CLOUD"].map((a, i) => {
            //크기에 비례하게 속도 조정
            OBJBG.POS["CLOUD"][i][0] -= oneStep * 0.02 * OBJBG.POS["CLOUD"][i][2];
        });
        //사라진 구름 다시 추가
        OBJBG.POS["CLOUD"] = OBJBG.POS["CLOUD"].filter(a => a[0] + a[2] > 0);
        if (OBJBG.POS["CLOUD"].length < OBJBG.CPT["CLOUD"]) {
            var add = OBJBG.POS["CLOUD"].length - OBJBG.CPT["CLOUD"];
            OBJBG.POS["CLOUD"].push([800, getRandomInt(20, 150), getRandomInt(30, 50)]);
        }

    }

    function drawBgObj() {
        OBJBG.POS["CLOUD"].map(a => {
            Canvas.ctx.drawImage(OBJBG.PIC["CLOUD"], a[0], a[1], a[2], a[2]);

        });
        var mp = OBJBG.POS["MOUNTAIN2"];
        Canvas.ctx.drawImage(OBJBG.PIC["MOUNTAIN2"], mp[0] - 800, mp[1] + 129, 800, 300);
        Canvas.ctx.drawImage(OBJBG.PIC["MOUNTAIN2"], mp[0], mp[1] + 129, 800, 300);
        //Canvas.ctx.drawImage(OBJBG.PIC["MOON"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJBG.PIC["STAR"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJBG.PIC["STONE_A"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJBG.PIC["STONE_B"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJITEM.PIC["APPLE"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJITEM.PIC["BUTTERFLY"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJITEM.PIC["CARROT"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJITEM.PIC["STRAWBERRY"], 0, 200, 800, 400);
        //Canvas.ctx.drawImage(OBJITEM.PIC["LIKE"], 0, 200, 800, 400);

    }

    function drawAllTimeColor() {
        Canvas.ctx.globalAlpha = COLOR.AIROPACITY;
        Canvas.ctx.fillStyle = rgbToHex(COLOR.AIR);
        Canvas.ctx.fillRect(0, 0, 800, 600);
        Canvas.ctx.globalAlpha = 1;
    }

    function LoadData(f) {
        var pngaddcode = "data:image/png;base64,";
        var svgaddcode = "data:image/svg+xml;base64,";
        var count = 0;
        var counter = function (num) {
            count++;
            if (count + 1 === f.length) {
                return loadComplete();
            }
        };
        f.map(a => {
            loadJSON("data/" + a, function (data) {
                if (a === "data.json") {
                    data.Pic.map((a, i) => {
                        OBJMOD.Pic.push(new Image());
                        OBJMOD.Pic[i].src = pngaddcode + a;
                    });
                    OBJMOD.SetBgPic();
                }
                if (a === "bgobj.json") {
                    Object.entries(data).map(a => {
                        OBJBG.PIC[a[0]] = new Image();
                        OBJBG.PIC[a[0]].src = svgaddcode + a[1];
                    });
                    OBJBG.SetBgObjPos();
                }
                if (a === "itemobj.json") {
                    Object.entries(data).map(a => {
                        OBJITEM.PIC[a[0]] = new Image();
                        OBJITEM.PIC[a[0]].src = svgaddcode + a[1];
                    });
                }
                counter();
            }, function (xhr) { console.error(xhr); });
        });
    }

    function loadComplete() {
        Canvas.init();
        SipuViewer.intervalId = setInterval(function () {
            CanvasLoop(Canvas);
        }, 1000 / SipuViewer.init.fps);
    }

    SipuViewer.main = function () {
        var files = ["bgobj.json", "itemobj.json", "data.json"];
        LoadData(files);
    };
    return SipuViewer;
})(window.SipuViewer || {});
SipuViewer.main();
