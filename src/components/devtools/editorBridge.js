class EditorBridge {
    controller = null;

    setController(ctrl) {
        this.controller = ctrl;
    }

    getController() {
        return this.controller;
    }

    placeAsset(data) {
        if (!this.controller) {
            console.warn("EditorController not ready");
            return;
        }

        console.log('data', data);
        this.controller.startPlacement(data);
    }

    enableEditor(v) {
        this.controller?.setEnabled(v);
    }

    saveWorldAsJson() {
        this.controller.saveWorldAsJson()
    }

    loadWorldFromJson(data) {
        this.controller.loadWorld(data);
    }
}

export const editorBridge = new EditorBridge();