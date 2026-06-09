import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
        const isOpen = document.body.classList.toggle("menu-open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
            document.body.classList.remove("menu-open");
            menuButton.setAttribute("aria-expanded", "false");
        }
    });
}

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function initializeViewer() {
    const container = document.getElementById("model-viewer");
    if (!container) {
        return;
    }

    const status = container.querySelector(".viewer-status");
    const modelSrc = container.dataset.modelSrc;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const controls = new OrbitControls(camera, renderer.domElement);
    const loader = new STLLoader();
    const modelGroup = new THREE.Group();
    let autoSpin = true;
    let loadedMesh = null;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff, 0);
    container.appendChild(renderer.domElement);

    scene.add(modelGroup);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5b0b1a, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 7, 9);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x971832, 1.1);
    fillLight.position.set(-7, 3, -4);
    scene.add(fillLight);

    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = false;
    controls.minDistance = 25;
    controls.maxDistance = 900;
    controls.target.set(0, 0, 0);

    const grid = new THREE.GridHelper(260, 18, 0x971832, 0xd8b9bf);
    grid.position.y = -40;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    scene.add(grid);

    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const frameModel = (mesh) => {
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeVertexNormals();

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const largestSide = Math.max(size.x, size.y, size.z);

        mesh.position.sub(center);
        modelGroup.rotation.x = -Math.PI / 2;

        const distance = largestSide * 1.75;
        camera.position.set(distance * 0.75, distance * 0.55, distance * 0.85);
        camera.near = Math.max(distance / 1000, 0.1);
        camera.far = distance * 10;
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.minDistance = distance * 0.35;
        controls.maxDistance = distance * 3.5;
        controls.update();
    };

    const resetView = () => {
        if (!loadedMesh) {
            return;
        }

        const box = new THREE.Box3().setFromObject(loadedMesh);
        const size = box.getSize(new THREE.Vector3());
        const largestSide = Math.max(size.x, size.y, size.z);
        const distance = largestSide * 1.75;

        modelGroup.rotation.set(-Math.PI / 2, 0, 0);
        camera.position.set(distance * 0.75, distance * 0.55, distance * 0.85);
        controls.target.set(0, 0, 0);
        controls.update();
    };

    loader.load(
        modelSrc,
        (geometry) => {
            const material = new THREE.MeshStandardMaterial({
                color: 0x8f1830,
                metalness: 0.26,
                roughness: 0.42
            });
            loadedMesh = new THREE.Mesh(geometry, material);
            loadedMesh.castShadow = true;
            loadedMesh.receiveShadow = true;
            modelGroup.add(loadedMesh);
            frameModel(loadedMesh);

            if (status) {
                status.classList.add("is-hidden");
            }
        },
        undefined,
        () => {
            if (status) {
                status.textContent = "The STL could not be loaded. Open this page from a local server so the browser can fetch repository files.";
            }
        }
    );

    document.getElementById("reset-view")?.addEventListener("click", resetView);
    document.getElementById("toggle-spin")?.addEventListener("click", () => {
        autoSpin = !autoSpin;
    });

    const animate = () => {
        requestAnimationFrame(animate);

        if (autoSpin && loadedMesh) {
            modelGroup.rotation.z += 0.004;
        }

        controls.update();
        renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
}

function initializeContactForm() {
    const form = document.getElementById("contact-form");
    const formStatus = document.getElementById("form-status");

    if (!form || !formStatus) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector(".submit-btn");
        const originalText = submitButton?.textContent || "Send Message";
        const formData = new FormData(form);

        if (submitButton) {
            submitButton.textContent = "Sending...";
            submitButton.disabled = true;
        }

        formStatus.textContent = "";

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: { Accept: "application/json" }
            });

            if (!response.ok) {
                throw new Error("Form submission failed");
            }

            formStatus.textContent = "Thanks, your message has been sent.";
            form.reset();
        } catch {
            formStatus.textContent = "Something went wrong. Please try again in a moment.";
        } finally {
            if (submitButton) {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        }
    });
}

initializeViewer();
initializeContactForm();
