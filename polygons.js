function round(num, decimals=2) {   // technically not perfect but good enough for working with pixel fractions
    let factor = 10**decimals;
    return Math.round(num*factor/factor)
}

class PointLabel {
    constructor(point, index, update_fn) {
        this._index = index;
        this._lbl = document.createElement("li");
        this._lbl.classList.add("point-lbl");
        this._lbl.id = `point-${this._index+1}-lbl`;

        this._x_edt = document.createElement("input");
        this._x_edt.type = "number";
        this._x_edt.min = 0;
        this._x_edt.value = point.x;
        this._x_edt.id = `point-${this._index+1}-x-edt`;

        this._y_edt = document.createElement("input");
        this._y_edt.type = "number";
        this._y_edt.min = 0;
        this._y_edt.value = point.y;
        this._y_edt.id = `point-${this._index+1}-y-edt`;

        this._del_btn = document.createElement("button");
        this._del_btn.textContent = "x";

        this._title = document.createElement("span");
        this._title.textContent = `Point ${this._index+1}: `;
        this._title.classList.add("title");

        this._lbl.appendChild(this._title);
        this._lbl.appendChild(document.createTextNode("x: "))
        this._lbl.appendChild(this._x_edt);
        this._lbl.appendChild(document.createTextNode("y: "))
        this._lbl.appendChild(this._y_edt);
        this._lbl.appendChild(this._del_btn);
    }

    setOnxinput(fn) {
        this._x_edt.oninput = fn;
    }

    setOnyinput(fn) {
        this._y_edt.oninput = fn;
    }

    setOndelete(fn) {
        this._del_btn.onclick = fn;
    }

    setIndex(i) {
        this._index = i;
        this._title.textContent = `Point ${this._index+1}: `;
        this._lbl.id = `point-${this._index+1}-lbl`;
        this._x_edt.id = `point-${this._index+1}-x-edt`;
        this._y_edt.id = `point-${this._index+1}-y-edt`;
    }

    getIndex() {
        return this._index;
    }

    getLabel() {
        return this._lbl;
    }

    getXvalue() {
        return this._x_edt.value;
    }

    getYvalue() {
        return this._y_edt.value;
    }

    setXvalue(x) {
        this._x_edt.value = x;
    }

    setYvalue(y) {
        this._y_edt.value = y;
    }
}

class Polygon {
    constructor() {
        this._svg = document.getElementById("canvas");
        this._line = this._svg.getElementsByTagName("polyline")[0];
        this._shape = this._svg.getElementsByTagName("path")[0];

        this._size = 500;
        this._padding = 10;
        this._svg.setAttribute("viewBox", `${-this._padding} ${-this._padding} ${this._size+2*this._padding} ${this._size+2*this._padding}`);
        this._svg.setAttribute("width", `${this._size+2*this._padding}`);
        this._svg.setAttribute("height", `${this._size+2*this._padding}`);

        this._d = "";
        this._points = [];
        this._labels = [];
        this._markers = [];
        this._point_list_elem = document.getElementById("point-list")

        this._radius = 50;
        this._limit_radius = false;
        this._corner_style = "arc";
        let selected = undefined;
        let marker_radius = 15;
        document.getElementById("point-marker").setAttribute("r", marker_radius);

        this._svg.addEventListener("pointerdown", (e) => {
            let x = e.offsetX-this._padding;
            let y = e.offsetY-this._padding;
            for (let i=0; i<this._markers.length; i++) {
                let p = this._points[i]

                if ((x-p.x)**2 + (y-p.y)**2 < (marker_radius + 5)**2) {
                    selected = i;
                }
            }
            if (selected === undefined)
                this.addPoint(x, y);
        });

        this._svg.addEventListener("pointermove", (e) => {
            if (selected !== undefined) {
                this.editPoint(selected, e.offsetX-this._padding, e.offsetY-this._padding);
            }
        });

        this._svg.addEventListener("pointerup", (e) => {
            selected = undefined;
        });

        this._svg.addEventListener("pointerleave", (e) => {
            selected = undefined;
        });

        this.update();
    }

    setRadius(r) {
        this._radius = r;
        this.update();
    }

    setLimitRadius(b) {
        this._limit_radius = b;
        this.update();
    }

    setLineVisibility(b) {
        this._line.style.stroke = b ? "#0008" : "none";
        this.update();
    }

    setColor(c) {
        this._shape.setAttribute("fill", c);
        this.update();
    }

    setCornerStyle(s) {
        this._corner_style = s;
        this.update();
    }

    setSVGPaths() {
        this._line.setAttribute(
            "points",
            this._points.map((p) => ` ${p.x} ${p.y}`) +
            ` ${this._points[0]?.x ?? 0} ${this._points[0]?.y ?? 0}`
        );
        this._shape.setAttribute("d", this._d);}

    update() {
        this.generateRoundedPath();
        this.setSVGPaths();
        this.createSVGCode();
    }

    getHalfwayPoint(index=undefined) {
        let i = index ?? this._points.length-1;

        let p = this._points[i]??{x: 0, y: 0};
        let p_next = this._points[i>=this._points.length-1? 0: i+1];
        const vx = (p_next?.x ?? p.x*2) - p.x;
        const vy = (p_next?.y ?? p.y*2) - p.y;
        return {x: round(p.x + vx/2, 1), y: round(p.y + vy/2, 1)};
    }

    editPoint(index, x=undefined, y=undefined) {
        if (x) {
            x = round(x, 1);
            this._points[index].x = x;
            this._markers[index].setAttribute("x", x);
            this._labels[index].setXvalue(x);
        }
        
        if (y) {
            y = round(y, 1);
            this._points[index].y = y;
            this._markers[index].setAttribute("y", y);
            this._labels[index].setYvalue(y);
        }
        this.update();
    }

    addPoint(x, y) {
        let p = { x: round(x, 1), y: round(y, 1) };
        this._points.push(p);

        let marker = document.createElementNS("http://www.w3.org/2000/svg","use");
        marker.setAttribute("x", x);
        marker.setAttribute("y", y);
        marker.setAttribute("href", "#point-marker");
        this._markers.push(marker);
        this._svg.appendChild(marker);

        let lbl = new PointLabel(p, this._points.length-1);
        lbl.setOnxinput((e) => { this.editPoint(lbl.getIndex(), +e.target.value) });
        lbl.setOnyinput((e) => { this.editPoint(lbl.getIndex(), undefined, +e.target.value) });
        lbl.setOndelete(() => { this.removePoint(lbl._index); });

        this._labels.push(lbl);
        this._point_list_elem.appendChild(lbl.getLabel());

        this.update();
    }

    removePoint(i) {
        this._point_list_elem.removeChild(this._labels[i].getLabel());
        this._svg.removeChild(this._markers[i]);
        this._points.splice(i, 1);
        this._labels.splice(i, 1);
        this._markers.splice(i, 1);
        this.updateLabels();
        this.update();
    }

    updateLabels() {
        for (let i=0; i<this._labels.length; i++) {
            this._labels[i].setIndex(i);
        }
    }

    _getPointParameters(index) {
        const p_prev = this._points[index - 1] ?? this._points[this._points.length - 1];
        const p = this._points[index];
        const p_next = this._points[index + 1] ?? this._points[0];

        const v1 = { x: p.x - p_prev.x, y: p.y - p_prev.y };
        const v1_l = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        v1.x /= v1_l?v1_l:1;
        v1.y /= v1_l?v1_l:1;

        const v2 = { x: p_next.x - p.x, y: p_next.y - p.y };
        const v2_l = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        v2.x /= v2_l?v2_l:1;
        v2.y /= v2_l?v2_l:1;

        let angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x); // angle between two sides (tail-tail)
        angle = Math.PI - angle; // to tip-tail angle of vectors
        angle = (angle + 2 * Math.PI) % (2 * Math.PI); // map to 0°-360° range

        let invert_curve = angle > Math.PI ? 0 : 1;

        let l = (this._radius / Math.abs(Math.tan(angle / 2)));
        let r = this._radius;

        let min = Math.min(v1_l / 2, v2_l / 2);
        if (l > min) {
            r = Math.abs(Math.tan(angle / 2)) * min;
            l = min;
        }
        return {radius: r, invert_curve: invert_curve, point: p, vector1: v1, vectr2: v2, angle: angle, length: l?l:0}
    }

    generateRoundedPath() {
        if (this._points.length > 1) {
            let param_list = this._points.map((p, i) => this._getPointParameters(i));
            let min_r = param_list.reduce((min, current) => current.radius < min ? current.radius : min, param_list[0].radius);

            for (let i = 0; i < this._points.length; i++) {
                let {radius: r, invert_curve: c, point: p, vector1: v1, vectr2: v2, angle: angle, length: l} = param_list[i];

                if (this._limit_radius) {
                    l = min_r / Math.abs(Math.tan(angle / 2));
                    r = min_r;
                }

                v1.x = round(v1.x * l);
                v1.y = round(v1.y * l);
                v2.x = round(v2.x * l);
                v2.y = round(v2.y * l);
                r = round(r);

                if (i == 0) this._d = `M${p.x - v1.x}, ${p.y - v1.y}`;
                else this._d += ` L${p.x - v1.x}, ${p.y - v1.y}`;

                switch (this._corner_style) {
                    case ("arc"):
                        this._d += ` A${r} ${r} 0 0 ${c} ${p.x + v2.x}, ${p.y + v2.y}`;
                        break;
                    case ("bezier"):
                        this._d += ` Q${p.x}, ${p.y} ${p.x + v2.x}, ${p.y + v2.y}`;
                        break;
                }
            }
        }
    }

    createSVGCode() {
        let code = "";
        code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">\n\t<path fill="${this._shape.getAttribute("fill")}" d="${this._d}"/>\n</svg>`
        document.getElementById("path-code").innerText = code;
    }

    clear(x, y) {
        this._points = [];
        this._d = "";
        this.update();
        this._markers.forEach( m => {this._svg.removeChild(m)});
        this._markers = [];
        this._point_list_elem.textContent = "";
    }
}

const poly = new Polygon();

document.getElementById("clear-btn").onclick = () => {
    poly.clear();
};

document.getElementById("copy-code-btn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("path-code").innerText)
        .then(() => {
            alert('Text copied to clipboard');
        })
        .catch(err => {
            console.error('Error copying text: ', err);
        });
}

radius_slider = document.getElementById("radius-sld");
radius_edit = document.getElementById("radius-edt");
radius_check = document.getElementById("radius-limit-chk");
poly.setRadius(radius_edit.value);

radius_slider.oninput = (e) => {
    radius_edit.value = e.target.value;
    poly.setRadius(e.target.value);
};

radius_edit.oninput = (e) => {
    let val = e.target.value > radius_edit.min ? e.target.value : radius_edit.min;
    radius_slider.value = val;
    poly.setRadius(val);
};

radius_check.oninput = () => {
    poly.setLimitRadius(radius_check.checked);
}

line_vis = document.getElementById("line-vis-chk");
line_vis.oninput = () => {
    poly.setLineVisibility(line_vis.checked);
} 

document.getElementById("color-pick").oninput = (e) => {
    poly.setColor(e.target.value);
}

document.getElementById("corner-style-edt").oninput = (e) => {
    poly.setCornerStyle(e.target.value);
}

document.getElementById("add-point-btn").onclick = () => {
    let p = poly.getHalfwayPoint();
    poly.addPoint(p.x, p.y);
}