class CircularGallery {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            alpha: false
        });
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.currentImage = null;
        this.isAnimating = true;
        this.animationFrameId = null;
        this.startTime = performance.now();
        this.pausedTime = 0;  // Сохраняем время, когда поставили на паузу
        this.totalPausedTime = 0;  // Общее время на паузе
        this.loadImage();
        this.initWebGL();
    }

    updateImage(newImage) {
        this.currentImage = newImage;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, newImage);
    }

    async loadImage() {
        const img = new Image();
        img.src = 'assets/img1.jpg';  // Начальное изображение
        await new Promise(resolve => {
            img.onload = () => {
                this.currentImage = img;
                resolve();
            };
        });

        // Start animation once image is loaded
        this.startTime = performance.now();
        this.animate();
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    async initWebGL() {
        // Load shader sources
        const vertexShaderSource = await fetch('shaders/circular-vertex.glsl').then(r => r.text());
        const fragmentShaderSource = await fetch('shaders/circular-fragment.glsl').then(r => r.text());

        // Create shaders
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(this.program));
            return;
        }

        // Create buffers
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);

        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0,
        ]);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

        // Get attribute locations
        this.positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'aTexCoord');

        // Get uniform locations
        this.timeLocation = this.gl.getUniformLocation(this.program, 'uTime');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');

        // Create and set up texture
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    }

    resizeCanvas() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        }
    }

    render(time) {
        if (!this.isAnimating) return;

        this.resizeCanvas();

        // Clear canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        if (!this.currentImage) return;

        // Use shader program
        this.gl.useProgram(this.program);

        // Set uniforms с учётом общего времени на паузе
        const currentTime = (time - this.startTime - this.totalPausedTime) / 1000;
        this.gl.uniform1f(this.timeLocation, currentTime);
        this.gl.uniform2f(this.resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Set up position attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Set up texCoord attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Update texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.currentImage);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // Запрашиваем следующий кадр только если анимация активна
        if (this.isAnimating) {
            this.animationFrameId = requestAnimationFrame((t) => this.render(t));
        }
    }

    animate(time) {
        if (this.isAnimating) {
            this.render(time);
        }
    }

    toggleAnimation(isPaused) {
        this.isAnimating = !isPaused;
        
        if (this.isAnimating) {
            // Возобновляем анимацию
            const currentTime = performance.now();
            if (this.pausedTime) {
                // Добавляем время, проведённое на паузе
                this.totalPausedTime += currentTime - this.pausedTime;
                this.pausedTime = 0;
            }
            this.render(currentTime);
        } else {
            // Ставим на паузу
            this.pausedTime = performance.now();
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gallery');
    const gallery = new CircularGallery(canvas);
    // Создаем контроллер и передаем ему экземпляр галереи
    new GalleryController(gallery);
}); 