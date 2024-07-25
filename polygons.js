function round(num) {   // technically not perfect but good enough for working with pixel fractions
    return Math.round(num*100/100)
}

class PointLabel {
    constructor(point, index, update_fn) {
        this.index = index;
        this.lbl = document.createElement("li");
        this.lbl.classList.add("point-lbl");
        this.lbl.id = `point-${this.index+1}-lbl`;

        this.x_edt = document.createElement("input");
        this.x_edt.type = "number";
        this.x_edt.min = 0;
        this.x_edt.value = point.x;
        this.x_edt.id = `point-${this.index+1}-x-edt`;

        this.y_edt = document.createElement("input");
        this.y_edt.type = "number";
        this.y_edt.min = 0;
        this.y_edt.value = point.y;
        this.y_edt.id = `point-${this.index+1}-y-edt`;

        this.del_btn = document.createElement("button");
        this.del_btn.textContent = "x";

        this.title = document.createTextNode(`Point ${this.index+1}: `)
        this.lbl.appendChild(this.title);
        this.lbl.appendChild(document.createTextNode("x: "))
        this.lbl.appendChild(this.x_edt);
        this.lbl.appendChild(document.createTextNode(", y: "))
        this.lbl.appendChild(this.y_edt);
        this.lbl.appendChild(this.del_btn);
    }

    onxinput(fn) {
        this.x_edt.oninput = fn;
    }

    onyinput(fn) {
        this.y_edt.oninput = fn;
    }

    ondelete(fn) {
        this.del_btn.onclick = fn;
    }

    setIndex(i) {
        this.index = i;
        this.title.textContent = `Point ${this.index+1}: `;
        this.lbl.id = `point-${this.index+1}-lbl`;
        this.x_edt.id = `point-${this.index+1}-x-edt`;
        this.y_edt.id = `point-${this.index+1}-y-edt`;
    }
}

class Polygon {
    constructor() {
        this.svg = document.getElementById("pen");
        this.line = this.svg.getElementsByTagName("polyline")[0];
        this.shape = this.svg.getElementsByTagName("path")[0];

        this.d = "";
        this.points = [];
        this.labels = [];
        this.markers = [];
        this.point_list_elem = document.getElementById("point-list")

        this.radius = 50;
        this.limit_radius = false;
        this.corner_style = "arc";
        let selected = undefined;
        let marker_radius = 15;
        document.getElementById("point-marker").setAttribute("r", marker_radius);

        this.svg.addEventListener("pointerdown", (e) => {
            let x = e.offsetX;
            let y = e.offsetY;
            for (let i=0; i<this.markers.length; i++) {
                let p = this.points[i]

                if ((x-p.x)**2 + (y-p.y)**2 < (marker_radius + 5)**2) {
                    selected = i;
                }
            }
            if (selected === undefined)
                this.addPoint(x, y);
        });

        this.svg.addEventListener("pointermove", (e) => {
            if (selected !== undefined) {
                this.editPoint(selected, e.offsetX, e.offsetY);
            }
        });

        this.svg.addEventListener("pointerup", (e) => {
            selected = undefined;
        });

        this.svg.addEventListener("pointerleave", (e) => {
            selected = undefined;
        })
    }

    setRadius(r) {
        this.radius = r;
        this.update();
    }

    setLimitRadius(b) {
        this.limit_radius = b;
        this.update();
    }

    setLineVisibility(b) {
        this.line.style.stroke = b ? "#0008" : "none";
        this.update();
    }

    setColor(c) {
        this.shape.style.fill = c;
        this.update();
    }

    setCornerStyle(s) {
        this.corner_style = s;
        this.update();
    }

    setSVGPaths() {
        this.line.setAttribute(
            "points",
            this.points.map((p) => ` ${p.x} ${p.y}`) +
            ` ${this.points[0]?.x ?? 0} ${this.points[0]?.y ?? 0}`
        );
        this.shape.setAttribute("d", this.d);}

    update() {
        this.generateRoundedPath();
        this.setSVGPaths();
    }

    editPoint(index, x=undefined, y=undefined) {
        if (x) {
            this.points[index].x = x;
            this.markers[index].setAttribute("x", x);
            this.labels[index].x_edt.value = x;
        }
        
        if (y) {
            this.points[index].y = y;
            this.markers[index].setAttribute("y", y);
            this.labels[index].y_edt.value = y;
        }
        this.update();
    }

    addPoint(x, y) {
        let p = { x: round(x), y: round(y) };
        this.points.push(p);

        let marker = document.createElementNS("http://www.w3.org/2000/svg","use");
        marker.setAttribute("x", x);
        marker.setAttribute("y", y);
        marker.setAttribute("href", "#point-marker");
        this.markers.push(marker);
        this.svg.appendChild(marker);

        let lbl = new PointLabel(p, this.points.length-1);
        lbl.onxinput((e) => { this.editPoint(lbl.index, +e.target.value) });
        lbl.onyinput((e) => { p.y = +e.target.value; this.update(); marker.setAttribute("y", p.y); });
        lbl.ondelete(() => { this.removePoint(lbl.index); });

        this.labels.push(lbl);
        this.point_list_elem.appendChild(lbl.lbl);

        this.update();
    }

    removePoint(i) {
        this.point_list_elem.removeChild(this.labels[i].lbl);
        this.svg.removeChild(this.markers[i]);
        this.points.splice(i, 1);
        this.labels.splice(i, 1);
        this.markers.splice(i, 1);
        this.updateLabels();
        this.update();
    }

    updateLabels() {
        for (let i=0; i<this.labels.length; i++) {
            this.labels[i].setIndex(i);
        }
    }

    getPointParameters(index) {
        const p_prev = this.points[index - 1] ?? this.points[this.points.length - 1];
        const p = this.points[index];
        const p_next = this.points[index + 1] ?? this.points[0];

        const v1 = { x: p.x - p_prev.x, y: p.y - p_prev.y };
        const v1_l = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        v1.x /= v1_l;
        v1.y /= v1_l;

        const v2 = { x: p_next.x - p.x, y: p_next.y - p.y };
        const v2_l = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        v2.x /= v2_l;
        v2.y /= v2_l;

        let angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x); // angle between two sides (tail-tail)
        angle = Math.PI - angle; // to tip-tail angle of vectors
        angle = (angle + 2 * Math.PI) % (2 * Math.PI); // map to 0°-360° range

        let invert_curve = angle > Math.PI ? 0 : 1;

        let l = this.radius / Math.abs(Math.tan(angle / 2));
        let r = this.radius;

        let min = Math.min(v1_l / 2, v2_l / 2);
        if (l > min) {
            r = Math.abs(Math.tan(angle / 2)) * min;
            l = min;
        }
        return {radius: r, invert_curve: invert_curve, point: p, vector1: v1, vectr2: v2, angle: angle, length: l}
    }

    generateRoundedPath() {
        if (this.points.length > 1) {
            let param_list = this.points.map((p, i) => this.getPointParameters(i));
            let min_r = param_list.reduce((min, current) => current.radius < min ? current.radius : min, param_list[0].radius);

            for (let i = 0; i < this.points.length; i++) {
                let {radius: r, invert_curve: c, point: p, vector1: v1, vectr2: v2, angle: angle, length: l} = param_list[i];

                if (this.limit_radius) {
                    l = min_r / Math.abs(Math.tan(angle / 2));
                    r = min_r;
                }

                v1.x = round(v1.x * l);
                v1.y = round(v1.y * l);
                v2.x = round(v2.x * l);
                v2.y = round(v2.y * l);
                r = round(r);

                if (i == 0) this.d = `M${p.x - v1.x}, ${p.y - v1.y}`;
                else this.d += ` L${p.x - v1.x}, ${p.y - v1.y}`;

                switch (this.corner_style) {
                    case ("arc"):
                        this.d += ` A${r} ${r} 0 0 ${c} ${p.x + v2.x},${p.y + v2.y}`;
                        break;
                    case ("bezier"):
                        this.d += ` Q${p.x},${p.y} ${p.x + v2.x},${p.y + v2.y}`;
                        break;
                }
            }
        }
    }

    clear(x, y) {
        this.points = [];
        this.d = "";
        this.update();
        this.markers.forEach( m => {this.svg.removeChild(m)});
        this.markers = [];
        this.point_list_elem.textContent = "";
    }
}

const poly = new Polygon();

document.getElementById("clear-btn").onclick = () => {
    poly.clear();
};

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
