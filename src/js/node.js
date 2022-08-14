let nextId = 1;

class Node {
    constructor(parent) {
        this.id = `n[${nextId++}]`;

        this.position = {'x': 0, 'y': 0};
        this.visualPosition = {'x': 0, 'y': 0};

        this.minDistanceFromParent = 50;
        this.maxDistanceFromParent = 70;

        this.angleResolutionResolutionSelector = Node.pickAverage;
        this.minAngleOffset = -Math.PI / 4;
        this.maxAngleOffset = Math.PI / 4;

        this.children = [];

        if (parent) {
            this.parent = parent;
            this.parent.children.push(this);
        }

        this.extraRender = () => {};
    }

    static pickAverage(resolutions) {
        return resolutions[~~(resolutions.length / 2)];
    }

    static pickClosest(resolutions) {
        return resolutions[0];
    }

    static pickFurthest(resolutions) {
        return resolutions[resolutions.length - 1];
    }

    get angle() {
        if (!this.parent) {
            return null;
        }

        return normalize(angleBetween(this.position, this.parent.position));
    }

    needsLengthResolution() {
        if (!this.parent) return false;
        const distanceFromParent = dist(this.position, this.parent.position);
        return !isBetween(this.minDistanceFromParent, distanceFromParent, this.maxDistanceFromParent);
    }

    needsAngleResolution() {
        if (!this.parent) return null;
        const parentAngle = this.parent.angle;
        if (parentAngle === null) return false;

        const angleOffset = normalize(this.angle - parentAngle);

        if (!isBetween(normalize(this.minAngleOffset), angleOffset, normalize(this.maxAngleOffset))) {
            return true;
        }
    }

    onParentLengthResolved() {
        // this.resolveAngle();
    }

    resolveLength() {
        const angleToParent = angleBetween(this.position, this.parent.position);
        const averageDistance = (this.minDistanceFromParent + this.maxDistanceFromParent) / 2;

        const targetX = this.parent.position.x - averageDistance * Math.cos(angleToParent);
        const targetY = this.parent.position.y - averageDistance * Math.sin(angleToParent);

        this.position.x = targetX;
        this.position.y = targetY;

        this.children.forEach(child => child.onParentLengthResolved());
    }

    resolveAngle() {
        const distanceFromParent = dist(this.position, this.parent.position);
        const parentAngle = this.parent.angle;
        const averageOffset = (this.minAngleOffset + this.maxAngleOffset) / 2;
        const resolveWithAverageOffset = normalize(parentAngle + averageOffset);
        const resolveWithMinOffset = normalize(parentAngle + this.minAngleOffset);
        const resolveWithMaxOffset = normalize(parentAngle + this.maxAngleOffset);

        const resolutionWithMinOffset = {
            'x': this.parent.position.x + Math.cos(resolveWithMinOffset + Math.PI) * distanceFromParent,
            'y': this.parent.position.y + Math.sin(resolveWithMinOffset + Math.PI) * distanceFromParent,
        };

        const resolutionWithMaxOffset = {
            'x': this.parent.position.x + Math.cos(resolveWithMaxOffset + Math.PI) * distanceFromParent,
            'y': this.parent.position.y + Math.sin(resolveWithMaxOffset + Math.PI) * distanceFromParent,
        }

        const resolutionWithAverageOffset = {
            'x': this.parent.position.x + Math.cos(resolveWithAverageOffset + Math.PI) * distanceFromParent,
            'y': this.parent.position.y + Math.sin(resolveWithAverageOffset + Math.PI) * distanceFromParent,
        };

        const angleOffset = normalize(this.angle - parentAngle);

        const resolutions = [
            resolutionWithMinOffset,
            resolutionWithMaxOffset,
            resolutionWithAverageOffset,
        ].sort((a, b) => {
            const angleOffsetA = normalize(angleBetween(a, this.parent.position) - parentAngle) - angleOffset;
            const angleOffsetB = normalize(angleBetween(b, this.parent.position) - parentAngle) - angleOffset;
            return Math.abs(angleOffsetA) - Math.abs(angleOffsetB);
        });

        // const resolutionOffsets = resolutions.map((a) => {
        //     return normalize(angleBetween(a, this.parent.position) - parentAngle);
        // })

        const resolution = this.angleResolutionResolutionSelector(resolutions);
        
        this.position.x = resolution.x;
        this.position.y = resolution.y;

        const newAngleOffset = normalize(this.angle - parentAngle);
        // console.log('resolved angle', angleOffset, newAngleOffset, resolutionOffsets);

        // if (this.id === 'n[3]') throw new Error();
    }

    resolve() {
        // Resolve length elasticity
        if (this.needsLengthResolution()) {
            this.resolveLength();
        }

        // Resolve angle elasticity
        if (this.needsAngleResolution()) {
            this.resolveAngle();
        }
    }

    realign() {
        this.visualPosition.x = this.position.x;
        this.visualPosition.y = this.position.y;
        for (const child of this.children) {
            child.realign();
        }
    }

    cycle(elapsed) {
        const angleToTarget = angleBetween(this.visualPosition, this.position);
        let distanceToTarget = dist(this.visualPosition, this.position) * 0.2;
        
        this.visualPosition.x += distanceToTarget * Math.cos(angleToTarget);
        this.visualPosition.y += distanceToTarget * Math.sin(angleToTarget);

        this.resolve();

        for (const child of this.children) {
            child.cycle(elapsed);
        }
    }

    render() {
        ctx.wrap(() => {
            ctx.translate(this.visualPosition.x, this.visualPosition.y);

            ctx.fillStyle = '#f00';
            ctx.fillRect(-5, -5, 10, 10);

            if (this.parent) {
                ctx.lineWidth = 10;
                ctx.strokeStyle = '#fff';
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.parent.visualPosition.x - this.visualPosition.x, this.parent.visualPosition.y - this.visualPosition.y);
                ctx.stroke();
            }

            this.extraRender();
        });

        ctx.wrap(() => {
            ctx.globalAlpha *= 0.5;
            this.renderDebug();
        });

        for (const child of this.children) {
            ctx.wrap(() => child.render());
        } 
    }

    renderDebug() {
        ctx.wrap(() => {
            ctx.translate(this.position.x, this.position.y);

            ctx.fillStyle = '#fff';
            // ctx.fillRect(-5, -5, 10, 10);

            if (this.parent) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fff'
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.parent.position.x - this.position.x, this.parent.position.y - this.position.y);
                ctx.stroke();
            }

            const { angle } = this;
            if (angle) {
                const length = 30;

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#f00'
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(cos(this.angle) * length, sin(this.angle) * length);
                ctx.stroke();

                ctx.wrap(() => {
                    if (!this.parent || !this.parent.parent) return;
                    const parentAngle = this.parent.angle;

                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#0f0'
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(this.maxAngleOffset + this.parent.angle) * length, Math.sin(this.maxAngleOffset + this.parent.angle) * length);
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(this.minAngleOffset + this.parent.angle) * length, Math.sin(this.minAngleOffset + this.parent.angle) * length);
                    ctx.stroke();
                });

                // if (this.id === 'n[4]') {
                //     // console.log(angle);
                // }
            }

            ctx.fillStyle = '#fff';
            ctx.font = '12pt Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this.id, 0, -10);
        });
    }
}

