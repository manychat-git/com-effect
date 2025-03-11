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
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            border-radius: 12px;
            color: #37352F;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            z-index: 1000;
            box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, 
                        rgba(15, 15, 15, 0.1) 0px 3px 6px, 
                        rgba(15, 15, 15, 0.2) 0px 9px 24px;
            transition: all 0.3s ease;
            min-width: 260px;
        `;

        // Создаем заголовок
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: ${this.isExpanded ? '15px' : '0'};
            cursor: pointer;
            user-select: none;
            transition: margin 0.3s ease;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: 500;
            font-size: 14px;
            color: #37352F;
        `;
        title.textContent = 'Image Controls';

        const toggleButton = document.createElement('div');
        toggleButton.style.cssText = `
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            color: #37352F;
            transition: all 0.3s ease;
            font-size: 18px;
        `;
        toggleButton.innerHTML = '−';

        toggleButton.addEventListener('mouseover', () => {
            toggleButton.style.background = 'rgba(55, 53, 47, 0.08)';
        });
        toggleButton.addEventListener('mouseout', () => {
            toggleButton.style.background = 'transparent';
        });

        // Контейнер для содержимого
        const content = document.createElement('div');
        content.style.cssText = `
            transition: all 0.3s ease;
            overflow: hidden;
            opacity: 1;
        `;

        // Создаем зону для дропа файлов
        const dropZone = document.createElement('div');
        dropZone.style.cssText = `
            border: 2px dashed rgba(55, 53, 47, 0.2);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        dropZone.innerHTML = '<div style="font-size: 24px; margin-bottom: 10px;">📁</div>Drop image here<br>or click to upload';

        // Создаем кнопки
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Кнопка Reset
        const resetButton = document.createElement('button');
        resetButton.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            background: transparent;
            border: 1px solid rgba(55, 53, 47, 0.2);
            border-radius: 4px;
            color: #37352F;
            font-family: inherit;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        `;
        resetButton.innerHTML = '↺ Reset to Default';
        
        // Кнопка Save
        const saveButton = document.createElement('button');
        saveButton.style.cssText = resetButton.style.cssText;
        saveButton.innerHTML = '💾 Save Image';

        // Кнопка Pause
        const pauseButton = document.createElement('button');
        pauseButton.style.cssText = resetButton.style.cssText;
        pauseButton.innerHTML = '⏸️ Pause Animation';

        // Кнопка Record
        const recordButton = document.createElement('button');
        recordButton.style.cssText = resetButton.style.cssText;
        recordButton.innerHTML = '🔴 Start Recording';

        // Создаем индикатор записи
        const recordingIndicator = document.createElement('div');
        recordingIndicator.style.cssText = `
            display: none;
            font-size: 12px;
            color: #FF3B30;
            text-align: center;
            margin-top: 8px;
        `;
        recordingIndicator.textContent = 'Recording: 00:00';

        // Добавляем эффекты при наведении для всех кнопок
        [resetButton, saveButton, pauseButton, recordButton].forEach(button => {
            button.addEventListener('mouseover', () => {
                button.style.background = 'rgba(55, 53, 47, 0.08)';
            });
            button.addEventListener('mouseout', () => {
                button.style.background = 'transparent';
            });
        });

        // Эффекты при наведении на зону дропа
        dropZone.addEventListener('mouseover', () => {
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.4)';
            dropZone.style.background = 'rgba(55, 53, 47, 0.03)';
        });
        dropZone.addEventListener('mouseout', () => {
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            dropZone.style.background = 'transparent';
        });

        // Создаем скрытый input для файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        // Обработчики для drag & drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.6)';
            dropZone.style.background = 'rgba(55, 53, 47, 0.06)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            dropZone.style.background = 'transparent';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFile(file);
            }
            dropZone.style.borderColor = 'rgba(55, 53, 47, 0.2)';
            dropZone.style.background = 'transparent';
        });

        // Обработчик клика по зоне дропа
        dropZone.addEventListener('click', () => fileInput.click());

        // Обработчик выбора файла
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Обработчики для кнопок
        resetButton.addEventListener('click', () => {
            this.resetToDefaultImage();
        });

        saveButton.addEventListener('click', () => {
            this.saveCanvasAsImage();
        });

        pauseButton.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            if (this.gallery.toggleAnimation) {
                this.gallery.toggleAnimation(this.isPaused);
            }
            pauseButton.innerHTML = this.isPaused ? '▶️ Resume Animation' : '⏸️ Pause Animation';
        });

        // Добавляем обработчик для записи
        recordButton.addEventListener('click', () => {
            this.handleRecording(recordButton, recordingIndicator);
        });

        // Обработчик сворачивания/разворачивания
        header.addEventListener('click', () => {
            this.isExpanded = !this.isExpanded;
            content.style.height = this.isExpanded ? content.scrollHeight + 'px' : '0';
            content.style.opacity = this.isExpanded ? '1' : '0';
            content.style.marginTop = this.isExpanded ? '0' : '-10px';
            header.style.marginBottom = this.isExpanded ? '15px' : '0';
            toggleButton.innerHTML = this.isExpanded ? '−' : '+';
        });

        // Собираем UI
        header.appendChild(title);
        header.appendChild(toggleButton);
        buttonsContainer.appendChild(resetButton);
        buttonsContainer.appendChild(saveButton);
        buttonsContainer.appendChild(pauseButton);
        buttonsContainer.appendChild(recordButton);
        buttonsContainer.appendChild(recordingIndicator);
        content.appendChild(dropZone);
        content.appendChild(buttonsContainer);
        content.appendChild(fileInput);
        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);

        // Устанавливаем начальную высоту контента
        requestAnimationFrame(() => {
            content.style.height = content.scrollHeight + 'px';
        });
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
        
        // Временно скрываем контрольную панель
        document.querySelector('.gallery-controls')?.style.setProperty('display', 'none');
        
        // Делаем скриншот
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        
        // Показываем контрольную панель обратно
        document.querySelector('.gallery-controls')?.style.setProperty('display', '');
        
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

    // Update the handleRecording method to use the new streamData object
    async handleRecording(recordButton, recordingIndicator) {
        if (!this.supportedVideoType) {
            alert('Sorry, video recording is not supported in your browser');
            return;
        }

        if (!this.isRecording) {
            try {
                const streamData = await this.initializeScreenCapture();
                
                if (!streamData.stream) {
                    throw new Error('Failed to initialize canvas capture');
                }

                this.isRecording = true;
                this.recordingStartTime = Date.now();
                recordButton.innerHTML = '⬛ Stop Recording';
                recordingIndicator.style.display = 'block';

                this.recordingTimer = setInterval(() => {
                    const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                    const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
                    const seconds = (duration % 60).toString().padStart(2, '0');
                    recordingIndicator.textContent = `Recording: ${minutes}:${seconds}`;
                }, 1000);

                this.recordingPromise = this.startRecording(streamData);
                
            } catch (error) {
                console.error('Recording error:', error);
                alert('Failed to start recording: ' + error.message);
                this.stopRecording(recordButton, recordingIndicator);
            }
        } else {
            try {
                if (this.activeMediaRecorder && this.activeMediaRecorder.state === 'recording') {
                    this.activeMediaRecorder.stop();
                    const blob = await this.recordingPromise;
                    await this.saveRecording(blob);
                }
            } catch (error) {
                console.error('Error stopping recording:', error);
                alert('Failed to stop recording: ' + error.message);
            } finally {
                this.stopRecording(recordButton, recordingIndicator);
            }
        }
    }

    stopRecording(recordButton, recordingIndicator) {
        this.isRecording = false;
        this.activeMediaRecorder = null;
        this.recordedChunks = [];
        this.recordingPromise = null;
        recordButton.innerHTML = '🔴 Start Recording';
        recordingIndicator.style.display = 'none';
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
} 