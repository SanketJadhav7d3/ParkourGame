import * as CANNON from 'cannon';


class MaterialManager {
    constructor() {
        if (MaterialManager.instance) {
            return MaterialManager.instance;
        }

        this.materials = {};
        MaterialManager.instance = this;
    }

    createMaterial(name, options = {}) {
        const material = new CANNON.Material(name);
        Object.assign(material, options);
        this.materials[name] = material;
        return material;
    }

    createContactMaterial(mat1Name, mat2Name, options = {}) {
        const mat1 = this.materials[mat1Name];
        const mat2 = this.materials[mat2Name];
        if (mat1 && mat2) {
            const contactMaterial = new CANNON.ContactMaterial(mat1, mat2, options);
            return contactMaterial;
        } else {
            console.error('One or both materials not found:', mat1Name, mat2Name);
        }
    }

    getMaterial(name) {
        return this.materials[name];
    }
}

const materialManager = Object.freeze(new MaterialManager());
export default materialManager;
