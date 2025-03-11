class GalleryController {
    constructor(galleryInstance) {
        this.gallery = galleryInstance;
        this.canvas = document.getElementById('gallery');
        this.isExpanded = true;
        this.isPaused = false;
        this.supportedVideoType = this.getSupportedVideoType();
        this.createUI();
        this.setupEventListeners();
    }

    getSupportedVideoType() {
        if (!window.MediaRecorder) {
            console.warn('MediaRecorder is not supported');
            return null;
        }

        // Приоритет отдаём MP4 с H.264, затем WebM
        const types = [
            'video/mp4;codecs=h264',
            'video/mp4;codecs=avc1',
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`Using video type: ${type}`);
                return type;
            }
        }

        console.warn('No supported video type found');
        return null;
    }

    createUI() {
        // Создаем основной контейнер
        const container = document.createElement('div');
        container.className = 'gallery-controls';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 6px;
            box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, 
                        rgba(15, 15, 15, 0.1) 0px 3px 6px, 
                        rgba(15, 15, 15, 0.2) 0px 9px 24px;
            z-index: 1000;
            --expanded-width: 280px;
            --expanded-height: 360px;
            --collapsed-size: 36px;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                       height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            width: ${this.isExpanded ? 'var(--expanded-width)' : 'var(--collapsed-size)'};
            height: ${this.isExpanded ? 'var(--expanded-height)' : 'var(--collapsed-size)'};
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            transform-origin: top right;
        `;

        // Создаем header с кнопкой настроек
        const header = document.createElement('div');
        header.style.cssText = `
            position: relative;
            height: 36px;
        `;

        const settingsButton = document.createElement('div');
        settingsButton.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            transition: background 0.2s ease;
            cursor: pointer;
            z-index: 2;
        `;
        settingsButton.innerHTML = this.isExpanded ? '➖' : '⚙️';
        
        // Контейнер для содержимого
        const content = document.createElement('div');
        content.style.cssText = `
            padding: ${this.isExpanded ? '8px 16px 16px' : '0'};
            padding-top: 0;
            opacity: ${this.isExpanded ? '1' : '0'};
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 8px;
        `;

        // Создаем зону для дропа файлов
        const dropZone = document.createElement('div');
        dropZone.style.cssText = `
            border: 1px dashed rgba(55, 53, 47, 0.2);
            border-radius: 6px;
            padding: 16px;
            text-align: center;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: rgba(55, 53, 47, 0.02);
        `;
        dropZone.innerHTML = '<div style="font-size: 24px; margin-bottom: 8px;">📁</div>Drop image here<br>or click to upload';

        // Создаем контейнер для кнопок управления
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        `;

        // Добавляем слайдер для fishEyeLevel
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            grid-column: 1 / -1;
            padding: 8px 0;
            margin: 4px 0;
        `;

        const sliderLabel = document.createElement('div');
        sliderLabel.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            color: #37352F;
            letter-spacing: -0.01em;
        `;
        sliderLabel.innerHTML = '<span>Fish-eye Level</span><span id="fishEyeValue" style="font-variant-numeric: tabular-nums; color: rgba(55, 53, 47, 0.65);">0.8</span>';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.8';
        slider.max = '3';
        slider.step = '0.1';
        slider.value = '0.8';
        slider.style.cssText = `
            width: 100%;
            margin: 0;
            cursor: pointer;
            -webkit-appearance: none;
            background: transparent;
        `;

        // Добавляем стили для слайдера через отдельные правила
        const sliderStyles = document.createElement('style');
        sliderStyles.textContent = `
            input[type="range"]::-webkit-slider-runnable-track {
                width: 100%;
                height: 6px;
                background: rgba(55, 53, 47, 0.16);
                border-radius: 15px;
            }
            
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: black;
                margin-top: -5.5px;
                transition: background 0.2s ease;
            }
            
            input[type="range"]::-webkit-slider-thumb:hover {
                background: black;
            }
            
            input[type="range"]:focus {
                outline: none;
            }

            /* Firefox */
            input[type="range"]::-moz-range-track {
                width: 100%;
                height: 3px;
                background: rgba(55, 53, 47, 0.16);
                border-radius: 1.5px;
            }
            
            input[type="range"]::-moz-range-thumb {
                height: 14px;
                width: 14px;
                border: none;
                border-radius: 50%;
                background: rgb(55, 53, 47);
                transition: background 0.2s ease;
            }
            
            input[type="range"]::-moz-range-thumb:hover {
                background: rgba(55, 53, 47, 0.8);
            }
        `;
        document.head.appendChild(sliderStyles);

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('fishEyeValue').textContent = value.toFixed(1);
            this.gallery.updateFishEyeLevel(value);
        });

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);

        // Создаем кнопки управления
        const resetButton = this.createControlButton('↺', 'Reset Image');
        const pauseButton = this.createControlButton('⏸️', 'Pause Animation');
        const saveButton = this.createControlButton('💾', 'Save Image');
        const recordButton = this.createControlButton('🔴', 'Start Recording');

        // Добавляем обработчики
        settingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isExpanded = !this.isExpanded;
            
            // Обновляем иконку
            settingsButton.innerHTML = this.isExpanded ? '➖' : '⚙️';
            
            // Анимируем контейнер одновременно
            requestAnimationFrame(() => {
                container.style.width = this.isExpanded ? 'var(--expanded-width)' : 'var(--collapsed-size)';
                container.style.height = this.isExpanded ? 'var(--expanded-height)' : 'var(--collapsed-size)';
                
                // Анимируем контент
                content.style.opacity = this.isExpanded ? '1' : '0';
                content.style.padding = this.isExpanded ? '8px 16px 16px' : '0';
                content.style.paddingTop = '0';
            });
        });

        // Удаляем обработчик клика по документу, который сворачивал панель
        // Предотвращаем закрытие при клике внутри контента
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Добавляем обработчики для кнопок
        resetButton.addEventListener('click', () => this.resetToDefaultImage());
        saveButton.addEventListener('click', () => this.saveCanvasAsImage());
        pauseButton.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            if (this.gallery.toggleAnimation) {
                this.gallery.toggleAnimation(this.isPaused);
            }
            pauseButton.querySelector('.button-icon').textContent = this.isPaused ? '▶️' : '⏸️';
            pauseButton.querySelector('.tooltip').textContent = this.isPaused ? 'Resume Animation' : 'Pause Animation';
        });
        recordButton.addEventListener('click', () => {
            this.handleRecording(recordButton);
        });

        // Добавляем обработчики для drag & drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем сворачивание панели
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.4)';
            dropZone.style.background = 'rgba(55, 53, 47, 0.05)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем сворачивание панели
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            dropZone.style.background = 'rgba(55, 53, 47, 0.02)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем сворачивание панели
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFile(file);
            }
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            dropZone.style.background = 'rgba(55, 53, 47, 0.02)';
        });

        // Добавляем обработчик клика по зоне дропа
        dropZone.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем сворачивание панели
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFile(file);
                }
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });

        // Собираем UI
        controlsContainer.appendChild(sliderContainer);
        controlsContainer.appendChild(resetButton);
        controlsContainer.appendChild(pauseButton);
        controlsContainer.appendChild(saveButton);
        controlsContainer.appendChild(recordButton);

        content.appendChild(dropZone);
        content.appendChild(controlsContainer);

        header.appendChild(settingsButton);
        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);
    }

    createControlButton(icon, tooltip) {
        const button = document.createElement('button');
        button.style.cssText = `
            width: 100%;
            height: 36px;
            padding: 0;
            background: transparent;
            border: 1px solid rgba(55, 53, 47, 0.2);
            border-radius: 6px;
            color: #37352F;
            font-family: inherit;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        `;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'button-icon';
        iconSpan.textContent = icon;
        
        const tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'tooltip';
        tooltipDiv.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(55, 53, 47, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: all 0.2s ease;
            pointer-events: none;
            white-space: nowrap;
            z-index: 1001;
        `;
        tooltipDiv.textContent = tooltip;

        button.appendChild(iconSpan);
        button.appendChild(tooltipDiv);

        button.addEventListener('mouseover', () => {
            button.style.background = 'rgba(55, 53, 47, 0.08)';
            tooltipDiv.style.opacity = '1';
            tooltipDiv.style.top = '-35px';
        });

        button.addEventListener('mouseout', () => {
            button.style.background = 'transparent';
            tooltipDiv.style.opacity = '0';
            tooltipDiv.style.top = '-30px';
        });

        return button;
    }

    createButton(text) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 4px;
            color: #37352F;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.3s ease;
            width: 100%;
            text-align: left;
        `;

        button.addEventListener('mouseover', () => {
            button.style.background = 'rgba(55, 53, 47, 0.08)';
        });

        button.addEventListener('mouseout', () => {
            button.style.background = 'rgba(255, 255, 255, 0.9)';
        });

        return button;
    }

    setupEventListeners() {
        // Event listeners for the buttons
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isExpanded = !this.isExpanded;
            this.content.style.height = this.isExpanded ? this.content.scrollHeight + 'px' : '0';
            this.content.style.opacity = this.isExpanded ? '1' : '0';
            this.content.style.marginTop = this.isExpanded ? '0' : '-10px';
            this.header.style.marginBottom = this.isExpanded ? '15px' : '0';
            this.toggleButton.innerHTML = this.isExpanded ? '−' : '+';
        });

        this.uploadButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.triggerFileInput();
        });

        this.resetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetToDefaultImage();
        });

        this.saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveCanvasAsImage();
        });
    }

    handleFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.gallery.updateImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    saveCanvasAsImage() {
        const canvas = document.getElementById('gallery');
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'gallery-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    resetToDefaultImage() {
        const defaultImg = new Image();
        defaultImg.onload = () => {
            this.gallery.updateImage(defaultImg);
        };
        defaultImg.src = 'assets/img1.jpg';
    }

    triggerFileInput() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        // Обработчики для drag & drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = 'rgba(55, 53, 47, 0.6)';
            this.dropZone.style.background = 'rgba(55, 53, 47, 0.06)';
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            this.dropZone.style.background = 'transparent';
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFile(file);
            }
            this.dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            this.dropZone.style.background = 'transparent';
        });

        // Обработчик клика по зоне дропа
        this.dropZone.addEventListener('click', () => fileInput.click());

        // Обработчик выбора файла
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });
    }

    async initializeScreenCapture() {
        try {
            const canvas = document.getElementById('gallery');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            // Используем фиксированный FPS для стабильности
            const stream = canvas.captureStream(60);
            
            if (!stream) {
                throw new Error('Failed to capture canvas stream');
            }

            return { stream, canvas };
        } catch (error) {
            console.error('Error initializing canvas capture:', error);
            throw error;
        }
    }

    async startRecording(streamData) {
        const { stream, canvas } = streamData;
        
        // Настройки для максимального качества
        const options = {
            mimeType: this.supportedVideoType,
            videoBitsPerSecond: 16000000 // Высокий битрейт для лучшего качества
        };

        return new Promise((resolve, reject) => {
            const mediaRecorder = new MediaRecorder(stream, options);
            const recordedChunks = [];
            let frameCount = 0;
            let lastDrawTime = 0;
            const frameInterval = 1000 / 60; // 60 FPS

            const processFrame = (timestamp) => {
                if (mediaRecorder.state !== 'recording') return;

                const delta = timestamp - lastDrawTime;
                
                if (delta >= frameInterval) {
                    frameCount++;
                    lastDrawTime = timestamp;
                }

                requestAnimationFrame(processFrame);
            };

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log(`Recording finished - Total frames: ${frameCount}`);
                const blob = new Blob(recordedChunks, { type: this.supportedVideoType });
                resolve(blob);
            };

            mediaRecorder.onerror = (error) => {
                reject(error);
            };

            // Запускаем запись с более частыми чанками для плавности
            mediaRecorder.start(40);
            requestAnimationFrame(processFrame);
            
            this.recordedChunks = recordedChunks;
            this.activeMediaRecorder = mediaRecorder;
        });
    }

    async saveRecording(blob) {
        const isMP4 = this.supportedVideoType.includes('mp4');
        const fileExt = isMP4 ? 'mp4' : 'webm';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `gallery-recording-${timestamp}.${fileExt}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async handleRecording(recordButton) {
        if (!this.supportedVideoType) {
            alert('Sorry, video recording is not supported in your browser');
            return;
        }

        if (!this.isRecording) {
            try {
                // Начинаем запись
                this.isRecording = true;
                recordButton.querySelector('.button-icon').textContent = '⬛';
                recordButton.querySelector('.tooltip').textContent = 'Stop Recording';

                const streamData = await this.initializeScreenCapture();
                
                if (!streamData.stream) {
                    throw new Error('Failed to initialize canvas capture');
                }

                this.recordingPromise = this.startRecording(streamData);
                
            } catch (error) {
                console.error('Recording error:', error);
                alert('Failed to start recording: ' + error.message);
                this.stopRecording(recordButton);
            }
        } else {
            try {
                // Останавливаем запись
                this.isRecording = false;
                recordButton.querySelector('.button-icon').textContent = '🔴';
                recordButton.querySelector('.tooltip').textContent = 'Start Recording';

                if (this.activeMediaRecorder && this.activeMediaRecorder.state === 'recording') {
                    this.activeMediaRecorder.stop();
                    const blob = await this.recordingPromise;
                    await this.saveRecording(blob);
                }
            } catch (error) {
                console.error('Error stopping recording:', error);
                alert('Failed to stop recording: ' + error.message);
            }
        }
    }

    stopRecording(recordButton) {
        this.isRecording = false;
        this.activeMediaRecorder = null;
        this.recordedChunks = [];
        this.recordingPromise = null;
        
        // Обновляем только иконку и подсказку
        if (recordButton) {
            recordButton.querySelector('.button-icon').textContent = '⏺️';
            recordButton.querySelector('.tooltip').textContent = 'Start Recording';
        }
    }
} 