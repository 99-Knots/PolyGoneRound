function round(num, decimals=2) {   // technically not perfect but good enough for working with pixel fractions
    let factor = 10**decimals;
    return Math.round(num*factor)/factor
}

class PointLabel {
    constructor(point, index) {
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
        this._del_btn.textContent = "✕";

        this._title = document.createElement("span");
        this._title.textContent = `Point ${this._index+1}: `;
        this._title.classList.add("title");

        let x_span = document.createElement("span");
        x_span.appendChild(document.createTextNode("x:"));
        x_span.appendChild(this._x_edt);

        let y_span = document.createElement("span");
        y_span.appendChild(document.createTextNode("y:"));
        y_span.appendChild(this._y_edt);

        //this._lbl.appendChild(this._title);
        this._lbl.appendChild(x_span);
        this._lbl.appendChild(y_span);
        this._lbl.appendChild(this._del_btn);
    }

    /**
     * @param {((this: GlobalEventHandlers, ev: Event) => any) | null} fn
     */
    set onxinput(fn) {
        this._x_edt.oninput = fn;
    }

    /**
     * @param {((this: GlobalEventHandlers, ev: Event) => any) | null} fn
     */
    set onyinput(fn) {
        this._y_edt.oninput = fn;
    }

    /**
     * @param {((this: GlobalEventHandlers, ev: MouseEvent) => any) | null} fn
     */
    set ondelete(fn) {
        this._del_btn.onclick = fn;
    }

    set index(i) {
        this._index = i;
        this._title.textContent = `Point ${this._index+1}: `;
        this._lbl.id = `point-${this._index+1}-lbl`;
        this._x_edt.id = `point-${this._index+1}-x-edt`;
        this._y_edt.id = `point-${this._index+1}-y-edt`;
    }

    get index() {
        return this._index;
    }

    get label() {
        return this._lbl;
    }

    get x_value() {
        return this._x_edt.value;
    }

    get y_value() {
        return this._y_edt.value;
    }

    set x_value(x) {
        this._x_edt.value = x;
    }

    set y_value(y) {
        this._y_edt.value = y;
    }
}

class Polygon {
    constructor(w, h, r, limit_r, c_style, line_vis, color) {
        this._svg = document.getElementById("canvas");
        this._outline = this._svg.getElementsByTagName("polygon")[0];
        this._shape = this._svg.getElementsByTagName("path")[0];

        this._w = 0;
        this._h = 0;

        this._d = "";
        this._points = [];
        this._labels = [];
        this._markers = [];
        this._point_list_elem = document.getElementById("point-list")

        this._padding = 0;
        this._marker_radius = 0;
        this.width = w ?? 100;
        this.height = h ?? 100;
        this.radius = r ?? 50;
        this.limit_radius = limit_r ?? false;
        this.corner_style = c_style ?? "arc";
        this.line_visibility = line_vis ?? false;
        this.color = color ?? "#00f";

        let selected = undefined;
        
        this._svg.addEventListener("pointerdown", (e) => {
            let x = e.offsetX*this._x_factor-this._padding;
            let y = e.offsetY*this._y_factor-this._padding;
            for (let i=0; i<this._markers.length; i++) {
                let p = this._points[i]

                if ((x-p.x)**2 + (y-p.y)**2 < (this._marker_radius + 5)**2) {
                    selected = i;
                }
            }
            if (selected === undefined)
                this.addPoint(x, y);
        });

        this._svg.addEventListener("pointermove", (e) => {
            if (selected !== undefined) {
                this.editPoint(selected, e.offsetX*this._x_factor-this._padding, e.offsetY*this._y_factor-this._padding);
            }
        });

        this._svg.addEventListener("pointerup", (e) => {
            selected = undefined;
        });

        this._svg.addEventListener("pointerleave", (e) => {
            selected = undefined;
        });

        window.onresize = (e) => {
            this.recalcFactors();
            this.update();
        }

        this.recalcFactors();
        this.update();
    }

    set radius(r) {
        this._radius = r;
        this.update();
    }

    get radius() {return this._r}

    set limit_radius(b) {
        this._limit_radius = b;
        this.update();
    }

    get limit_radius() {return this._limit_radius}

    set line_visibility(b) {
        this._outline.style.display = b ? "block" : "none";
        this.update();
    }

    get line_visibility() {return this._outline.style.stroke=="none" ? false: true}

    set color(c) {
        this._shape.setAttribute("fill", c);
        this.update();
    }

    get color() {return this._shape.getAttribute("fill")}

    set corner_style(s) {
        this._corner_style = s;
        this.update();
    }

    get corner_style() {return this._corner_style}

    set marker_radius(r) {
        this._marker_radius = r;
        document.getElementById("point-marker").setAttribute("r", this._marker_radius);
    }

    get marker_radius() {return this._marker_radius};

    set width(w) {
        this._w = w;
        this.recalcFactors();
    }

    get width() {return this._w}

    set height(h) {
        this._h = h;
        //this._svg.setAttribute("viewBox", `${-this._padding} ${-this._padding} ${this._w+2*this._padding} ${this._h+2*this._padding}`);
        this.recalcFactors();
    }

    get height() {return this._h}

    recalcFactors() {
        let w = this._svg.clientWidth;
        let h = this._svg.clientHeight;
        
        this._x_factor = (this._w+2*this._padding)/w;
        this._y_factor = (this._h+2*this._padding)/h;

        let factor = window.getComputedStyle(this._svg).getPropertyValue("--marker-factor");
        this.marker_radius = this._x_factor*factor;
        this._padding = this._w * 0;
        this._svg.setAttribute("viewBox", `${-this._padding} ${-this._padding} ${this._w+2*this._padding} ${this._h+2*this._padding}`);
        
        this._outline.style.strokeWidth = this._x_factor*2;
        this._outline.style.strokeDasharray = `${this._x_factor*4} ${this._x_factor*2}`;
        document.getElementById("point-marker").setAttribute("stroke-width", this._x_factor*2);
    }

    setSVGPaths() {
        this._outline.setAttribute(
            "points",
            this._points.map((p) => ` ${p.x} ${p.y}`)
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
        if (x !== undefined) {
            x = round(x, 1);
            this._points[index].x = x;
            this._markers[index].setAttribute("x", x);
            this._labels[index].x_value = x;
        }
        
        if (y !== undefined) {
            y = round(y, 1);
            this._points[index].y = y;
            this._markers[index].setAttribute("y", y);
            this._labels[index].y_value = y;
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
        lbl.onxinput = (e) => { this.editPoint(lbl.index, +e.target.value) };
        lbl.onyinput = (e) => { this.editPoint(lbl.index, undefined, +e.target.value) };
        lbl.ondelete = () => { this.removePoint(lbl._index); };

        this._labels.push(lbl);
        this._point_list_elem.appendChild(lbl.label);

        this.update();
    }

    removePoint(i) {
        this._point_list_elem.removeChild(this._labels[i].label);
        this._svg.removeChild(this._markers[i]);
        this._points.splice(i, 1);
        this._labels.splice(i, 1);
        this._markers.splice(i, 1);
        this.updateLabels();
        this.update();
    }

    updateLabels() {
        for (let i=0; i<this._labels.length; i++) {
            this._labels[i].index = i;
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

                v1.x = v1.x * l;
                v1.y = v1.y * l;
                v2.x = v2.x * l;
                v2.y = v2.y * l;
                r = round(r);

                if (i == 0) this._d = `M${round(p.x - v1.x)}, ${round(p.y - v1.y)}`;
                else this._d += ` L${round(p.x - v1.x)}, ${round(p.y - v1.y)}`;

                switch (this._corner_style) {
                    case ("arc"):
                        this._d += ` A${r} ${r} 0 0 ${c} ${round(p.x + v2.x)}, ${round(p.y + v2.y)}`;
                        break;
                    case ("bezier"):
                        this._d += ` Q${p.x}, ${p.y} ${round(p.x + v2.x)}, ${round(p.y + v2.y)}`;
                        break;
                }
            }
        }
    }

    createSVGCode() {
        let code = "";
        code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this._w} ${this._h}">\n\t<path fill="${this.color}" d="${this._d}"/>\n</svg>`
        document.getElementById("path-code").textContent = code;
    }

    clear(x, y) {
        for (let i = this._points.length-1; i>=0; i--) {
            this.removePoint(i);
        }
    }
}


document.getElementById("copy-code-btn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("path-code").innerText)
        .then(() => {
            document.getElementById("copy-popup").classList.toggle("show", true);
            setTimeout(() => {document.getElementById("copy-popup").classList.toggle("show", false);}, 2000)
        })
        .catch(err => {
            console.error('Error copying text: ', err);
        });
}

let radius_slider = document.getElementById("radius-sld");
let radius_edit = document.getElementById("radius-edt");
let radius_check = document.getElementById("radius-limit-chk");
let line_vis = document.getElementById("line-vis-chk");
let color_pick = document.getElementById("color-pick");
let c_style_edt = document.getElementById("corner-style-edt");
let s_edt = document.getElementById("size-edt");

const poly = new Polygon(+s_edt.value, +s_edt.value, +radius_edit.value, radius_check.checked, c_style_edt.value, line_vis.value, color_pick.value);
poly.radius = radius_edit.value;

radius_slider.oninput = (e) => {
    radius_edit.value = e.target.value;
    poly.radius = e.target.value;
};

radius_edit.oninput = (e) => {
    let val = e.target.value > radius_edit.min ? e.target.value : radius_edit.min;
    radius_slider.value = val;
    poly.radius = val;
};

radius_check.oninput = () => {
    poly.limit_radius = radius_check.checked;
}

line_vis.oninput = () => {
    poly.line_visibility = line_vis.checked;
} 

color_pick.oninput = (e) => {
    poly.color = e.target.value;
}

c_style_edt.oninput = (e) => {
    poly.corner_style = e.target.value;
}

s_edt.oninput = (e) => {
    poly.width = +e.target.value;
    poly.height = +e.target.value;
}

document.getElementById("clear-btn").onclick = () => {
    poly.clear();
};

document.getElementById("add-point-btn").onclick = () => {
    let p = poly.getHalfwayPoint();
    poly.addPoint(p.x, p.y);
}