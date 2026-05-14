class Camera {
    constructor(FOV = 45.0, width = 640, height = 360, near = 0.1, far = 100.0) {
        this.FOV = FOV;
        this.width = width;
        this.height = height;
        this.near = near;
        this.far = far;

        this.yaw = 0.0;
        this.pitch = 0.0;

        this.radius = 10.0;

        this.position = new Point();

        this.Update(0.0, 0.0);
    }

    Update(yawOffset, pitchOffset) {
        if (this.pitch + pitchOffset >= 89.0)
            this.pitch = 89.0
        else if (this.pitch + pitchOffset < 10.0)
            this.pitch = 10.0
        else
            this.pitch = this.pitch + pitchOffset;
        this.yaw = this.yaw + yawOffset;

        let pitch_rad = this.pitch * Math.PI / 180.0;
        let yaw_rad = this.yaw * Math.PI / 180.0;

        this.position.x = this.radius * Math.cos(pitch_rad) * Math.cos(yaw_rad);
        this.position.y = this.radius * Math.sin(pitch_rad);
        this.position.z = this.radius * Math.cos(pitch_rad) * Math.sin(yaw_rad);
    }

    GetView() {
        var viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [this.position.x, this.position.y, this.position.z], [0.0, 0.0, 0.0], worldUp);
        return viewMatrix;
    }
    
    GetProjection() {
        var ratio = this.width / this.height;
        var projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, this.FOV, ratio, this.near, this.far);
        return projectionMatrix;
    }

    UpdateFOV(value) {
        let temp = this.FOV + value;
        
        if (temp  >= 1.0 || temp <= 90.0) {
            this.FOV = temp;
        }
    }

    UpdateAspectRation(width, height) {
        this.width = width;
        this.height = height;
    }
};
