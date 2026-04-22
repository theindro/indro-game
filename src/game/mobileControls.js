// mobileControls.js
export class MobileControls {
    constructor(app, canvas, crosshairEl) {
        this.app = app;
        this.canvas = canvas;
        this.crosshairEl = crosshairEl;

        // Touch state
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.moveDirection = { x: 0, y: 0 };
        this.moveMagnitude = 0;

        // Virtual joystick
        this.joystick = null;
        this.joystickBase = null;
        this.joystickThumb = null;
        this.showJoystick = false;

        // Shooting
        this.shootTouchActive = false;
        this.shootX = 0;
        this.shootY = 0;

        // UI Elements
        this.createJoystick();
        this.createShootButton();

        // Bind events
        this.bindEvents();
    }

    createJoystick() {
        // Create joystick container
        this.joystick = document.createElement('div');
        this.joystick.id = 'mobile-joystick';
        this.joystick.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 80px;
            width: 120px;
            height: 120px;
            border-radius: 60px;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(5px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            display: none;
            z-index: 1000;
            touch-action: none;
        `;

        // Joystick base
        this.joystickBase = document.createElement('div');
        this.joystickBase.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 80px;
            height: 80px;
            border-radius: 40px;
            background: rgba(255, 255, 255, 0.1);
            transform: translate(-50%, -50%);
        `;

        // Joystick thumb
        this.joystickThumb = document.createElement('div');
        this.joystickThumb.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.6);
            transform: translate(-50%, -50%);
            transition: transform 0.05s;
        `;

        this.joystickBase.appendChild(this.joystickThumb);
        this.joystick.appendChild(this.joystickBase);
        document.body.appendChild(this.joystick);
    }

    createShootButton() {
        // Shoot button
        this.shootButton = document.createElement('div');
        this.shootButton.id = 'mobile-shoot';
        this.shootButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 80px;
            width: 80px;
            height: 80px;
            border-radius: 40px;
            background: rgba(255, 50, 50, 0.8);
            backdrop-filter: blur(5px);
            border: 2px solid rgba(255, 255, 255, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            z-index: 1000;
            touch-action: none;
            user-select: none;
            cursor: pointer;
        `;
        this.shootButton.textContent = '⚔️';
        document.body.appendChild(this.shootButton);

        // Shoot indicator
        this.shootIndicator = document.createElement('div');
        this.shootIndicator.style.cssText = `
            position: fixed;
            width: 40px;
            height: 40px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.5);
            border: 2px solid white;
            display: none;
            pointer-events: none;
            z-index: 1001;
        `;
        document.body.appendChild(this.shootIndicator);
    }

    bindEvents() {
        // Joystick touch events
        this.joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchActive = true;
            const rect = this.joystick.getBoundingClientRect();
            this.touchStartX = rect.left + rect.width / 2;
            this.touchStartY = rect.top + rect.height / 2;
            this.updateJoystickPosition(e.touches[0]);
        });

        this.joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateJoystickPosition(e.touches[0]);
        });

        this.joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.resetJoystick();
        });

        // Shoot button events
        this.shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shootTouchActive = true;
            this.shootButton.style.transform = 'scale(0.95)';
            this.shootButton.style.background = 'rgba(255, 100, 100, 0.9)';
        });

        this.shootButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.shootTouchActive = false;
            this.shootButton.style.transform = 'scale(1)';
            this.shootButton.style.background = 'rgba(255, 50, 50, 0.8)';
        });

        // Direct tap to shoot (on canvas)
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.target === this.shootButton || this.joystick.contains(e.target)) return;

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Show shoot indicator
            this.shootIndicator.style.display = 'block';
            this.shootIndicator.style.left = (touch.clientX - 20) + 'px';
            this.shootIndicator.style.top = (touch.clientY - 20) + 'px';
            setTimeout(() => {
                this.shootIndicator.style.display = 'none';
            }, 150);

            // Set shoot position
            this.shootX = x;
            this.shootY = y;
            this.shootTouchActive = true;

            // Auto-release after short delay (for tapping)
            setTimeout(() => {
                if (this.shootTouchActive) {
                    this.shootTouchActive = false;
                }
            }, 100);
        });

        // Detect device orientation
        window.addEventListener('resize', () => this.adjustForOrientation());
        this.adjustForOrientation();
    }

    updateJoystickPosition(touch) {
        const rect = this.joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;

        const maxDistance = 40;
        const distance = Math.min(Math.hypot(dx, dy), maxDistance);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * distance;
        const thumbY = Math.sin(angle) * distance;

        this.joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

        // Calculate movement direction (normalized)
        this.moveMagnitude = distance / maxDistance;
        this.moveDirection.x = Math.cos(angle) * this.moveMagnitude;
        this.moveDirection.y = Math.sin(angle) * this.moveMagnitude;
    }

    resetJoystick() {
        this.touchActive = false;
        this.moveDirection = { x: 0, y: 0 };
        this.moveMagnitude = 0;
        this.joystickThumb.style.transform = 'translate(-50%, -50%)';
    }

    adjustForOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;

        if (isLandscape) {
            this.joystick.style.bottom = '40px';
            this.joystick.style.left = '40px';
            this.shootButton.style.bottom = '40px';
            this.shootButton.style.right = '40px';
        } else {
            this.joystick.style.bottom = '80px';
            this.joystick.style.left = '80px';
            this.shootButton.style.bottom = '80px';
            this.shootButton.style.right = '80px';
        }
    }

    show() {
        this.joystick.style.display = 'block';
        this.shootButton.style.display = 'flex';
    }

    hide() {
        this.joystick.style.display = 'none';
        this.shootButton.style.display = 'none';
    }

    getMovement() {
        if (!this.touchActive) return { x: 0, y: 0, active: false };
        return {
            x: this.moveDirection.x,
            y: this.moveDirection.y,
            active: this.touchActive,
            magnitude: this.moveMagnitude
        };
    }

    getShootPosition() {
        if (!this.shootTouchActive) return null;
        return { x: this.shootX, y: this.shootY };
    }

    isShooting() {
        return this.shootTouchActive;
    }

    destroy() {
        if (this.joystick) this.joystick.remove();
        if (this.shootButton) this.shootButton.remove();
        if (this.shootIndicator) this.shootIndicator.remove();
    }
}