function round(num) {   // technically not perfect but good enough for working with pixel fractions
    return Math.round(num*100/100)
}

class Polygon {
    constructor() {
        this.svg = document.getElementById("pen");
        this.line = this.svg.getElementsByTagName("polyline")[0];
        this.shape = this.svg.getElementsByTagName("path")[0];
        this.d = "";
        this.points = [];
        this.radius = 50;

        this.svg.addEventListener("pointerdown", (e) => {
            let rect = this.svg.getBoundingClientRect();
            let x = e.offsetX;
            let y = e.offsetY;
            this.addPoint(x, y);
        });
    }

    update() {
        this.line.setAttribute(
            "points",
            this.points.map((p) => ` ${p.x} ${p.y}`) +
            ` ${this.points[0]?.x} ${this.points[0]?.y}`
        );
        this.shape.setAttribute("d", this.d);
    }

    addPoint(x, y) {
        let p = { x: x, y: y };
        this.points.push(p);
        this.generateRoundedPath();
        this.update();
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
        let param_list = this.points.map((p, i) => this.getPointParameters(i));
        for (let i = 0; i < this.points.length; i++) {
            let {radius: r, invert_curve: c, point: p, vector1: v1, vectr2: v2, angle: angle, length: l} = param_list[i];

            v1.x = round(v1.x * l);
            v1.y = round(v1.y * l);
            v2.x = round(v2.x * l);
            v2.y = round(v2.y * l);
            r = round(r);

            if (i == 0) this.d = `M${p.x - v1.x}, ${p.y - v1.y}`;
            else this.d += ` L${p.x - v1.x}, ${p.y - v1.y}`;
            this.d += ` A${r} ${r} 0 0 ${c} ${p.x + v2.x},${p.y + v2.y}`;
            // this.d += ` Q${p.x},${p.y} ${p.x + v2.x},${p.y + v2.y}`;
        }
    }

    closeShape() {
        this.generateRoundedPath();
        this.update();
    }

    clear(x, y) {
        this.points = [];
        this.d = "";
        this.update();
    }
}

const poly = new Polygon();
const controls = document.getElementById("controls");

document.getElementById("clear-btn").onclick = () => {
    poly.clear();
};