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
        if (event.target instanceof HTMLButtonElement) {
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

function initializeSiteTabs() {
    const tabs = [...document.querySelectorAll(".site-tab[role='tab']")];
    const panels = [...document.querySelectorAll(".tab-panel[role='tabpanel']")];

    if (!tabs.length || !panels.length) {
        return;
    }

    const showPanel = (selectedTab, shouldFocus = false) => {
        const targetId = selectedTab.dataset.tabTarget;
        const selectedPanel = panels.find((panel) => panel.id === targetId);

        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });

        panels.forEach((panel) => {
            const isSelected = panel === selectedPanel;
            panel.hidden = !isSelected;
            panel.classList.toggle("is-active-panel", isSelected);
        });

        if (selectedPanel) {
            selectedPanel.classList.remove("is-active-panel");
            selectedPanel.getBoundingClientRect();
            selectedPanel.classList.add("is-active-panel");
        }

        document.querySelectorAll(`#${targetId} .reveal`).forEach((element) => {
            revealObserver.observe(element);
        });

        history.replaceState(null, "", `#${targetId}`);
        window.dispatchEvent(new Event("resize"));

        if (shouldFocus) {
            selectedTab.focus();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const tabFromHash = () => {
        const hash = window.location.hash.replace("#", "");
        return tabs.find((tab) => tab.dataset.tabTarget === hash) || null;
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => showPanel(tab));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                return;
            }

            event.preventDefault();
            let nextIndex = index;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = tabs.length - 1;
            showPanel(tabs[nextIndex], true);
        });
    });

    const initialTab = tabFromHash() || tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
    showPanel(initialTab);

    window.addEventListener("hashchange", () => {
        const hashedTab = tabFromHash();
        if (hashedTab) {
            showPanel(hashedTab);
        }
    });
}

function initializeProjectTabs() {
    const tabs = [...document.querySelectorAll(".project-tab")];
    const panel = document.getElementById("project-panel");
    const cards = [...document.querySelectorAll(".project-card[data-project-category]")];
    const emptyMessage = document.querySelector(".project-empty");

    if (!tabs.length || !panel || !cards.length) {
        return;
    }

    const selectTab = (selectedTab) => {
        const filter = selectedTab.dataset.projectFilter;
        let visibleCount = 0;

        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });

        cards.forEach((card) => {
            const categories = card.dataset.projectCategory?.split(" ") || [];
            const isVisible = filter === "all" || categories.includes(filter);
            card.hidden = !isVisible;
            if (isVisible) {
                visibleCount += 1;
            }
        });

        panel.setAttribute("aria-labelledby", selectedTab.id);
        if (emptyMessage) {
            emptyMessage.hidden = visibleCount > 0;
        }
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(tab));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                return;
            }

            event.preventDefault();
            let nextIndex = index;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = tabs.length - 1;
            selectTab(tabs[nextIndex]);
            tabs[nextIndex].focus();
        });
    });
}

function initializeProjectCards() {
    const cards = [...document.querySelectorAll(".project-card")];

    cards.forEach((card) => {
        const toggle = card.querySelector(".project-toggle");
        const files = card.querySelector(".project-files");

        if (!toggle || !files) {
            return;
        }

        const setOpen = (isOpen) => {
            card.classList.toggle("is-open", isOpen);
            files.hidden = !isOpen;
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.textContent = isOpen ? "Close files" : "Open files";
        };

        const toggleCard = () => setOpen(files.hidden);

        toggle.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleCard();
        });

        card.addEventListener("click", (event) => {
            const interactiveElement = event.target instanceof Element ? event.target.closest("a, button") : null;
            if (interactiveElement) {
                return;
            }

            toggleCard();
        });
    });
}

function initializeViewers() {
    const containers = [...document.querySelectorAll(".model-viewer[data-model-src]")];
    const stlLoader = new STLLoader();
    let occtPromise = null;

    const getOcct = () => {
        if (!window.occtimportjs) {
            return Promise.reject(new Error("occt-import-js is not available"));
        }

        occtPromise ||= window.occtimportjs();
        return occtPromise;
    };

    const flattenArray = (array) => {
        if (!array) {
            return [];
        }

        return Array.isArray(array[0]) ? array.flat() : array;
    };

    const createCadGroup = (result) => {
        const group = new THREE.Group();

        result.meshes.forEach((mesh, index) => {
            const geometry = new THREE.BufferGeometry();
            const positions = flattenArray(mesh.attributes?.position?.array);
            const normals = flattenArray(mesh.attributes?.normal?.array);
            const indices = flattenArray(mesh.index?.array);
            const color = mesh.color || [0.56, 0.09, 0.19];

            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            if (normals.length) {
                geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
            } else {
                geometry.computeVertexNormals();
            }

            if (indices.length) {
                geometry.setIndex(indices);
            }

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color[0], color[1], color[2]),
                metalness: 0.34,
                roughness: 0.42,
                side: THREE.DoubleSide
            });
            const modelMesh = new THREE.Mesh(geometry, material);
            modelMesh.name = mesh.name || `STEP mesh ${index + 1}`;
            group.add(modelMesh);
        });

        return group;
    };

    containers.forEach((container) => {
        const status = container.querySelector(".viewer-status");
        const modelSrc = container.dataset.modelSrc;
        const modelType = container.dataset.modelType || "stl";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        const controls = new OrbitControls(camera, renderer.domElement);
        const modelGroup = new THREE.Group();
        let autoSpin = true;
        let loadedObject = null;
        let frameDistance = 160;

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
            if (!width || !height) {
                return;
            }

            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        const frameModel = (object) => {
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const largestSide = Math.max(size.x, size.y, size.z) || 100;

            object.position.sub(center);
            modelGroup.rotation.x = -Math.PI / 2;
            frameDistance = largestSide * 1.75;

            camera.position.set(frameDistance * 0.75, frameDistance * 0.55, frameDistance * 0.85);
            camera.near = Math.max(frameDistance / 1000, 0.1);
            camera.far = frameDistance * 10;
            camera.updateProjectionMatrix();

            controls.target.set(0, 0, 0);
            controls.minDistance = frameDistance * 0.35;
            controls.maxDistance = frameDistance * 3.5;
            controls.update();
        };

        const resetView = () => {
            if (!loadedObject) {
                return;
            }

            modelGroup.rotation.set(-Math.PI / 2, 0, 0);
            camera.position.set(frameDistance * 0.75, frameDistance * 0.55, frameDistance * 0.85);
            controls.target.set(0, 0, 0);
            controls.update();
        };

        const finishLoad = (object) => {
            loadedObject = object;
            modelGroup.add(object);
            frameModel(object);
            resize();

            if (status) {
                status.classList.add("is-hidden");
            }
        };

        const showError = (message) => {
            if (status) {
                status.textContent = message;
            }
        };

        const loadStl = () => {
            stlLoader.load(
                modelSrc,
                (geometry) => {
                    geometry.computeVertexNormals();
                    const material = new THREE.MeshStandardMaterial({
                        color: 0x8f1830,
                        metalness: 0.26,
                        roughness: 0.42
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    finishLoad(mesh);
                },
                undefined,
                () => showError("The STL could not be loaded. Open this page from a local server so the browser can fetch repository files.")
            );
        };

        const loadStep = async () => {
            try {
                const [occt, response] = await Promise.all([getOcct(), fetch(modelSrc)]);
                if (!response.ok) {
                    throw new Error("STEP fetch failed");
                }

                const buffer = await response.arrayBuffer();
                const result = occt.ReadStepFile(new Uint8Array(buffer), {
                    linearUnit: "millimeter",
                    linearDeflectionType: "bounding_box_ratio",
                    linearDeflection: 0.001,
                    angularDeflection: 0.5
                });

                if (!result.success || !result.meshes?.length) {
                    throw new Error("STEP conversion failed");
                }

                finishLoad(createCadGroup(result));
            } catch {
                showError("The STEP model could not be loaded in this browser. Download the STEP file to inspect it in CAD software.");
            }
        };

        const toolbar = container.closest(".model-card")?.querySelector(".viewer-toolbar");
        toolbar?.querySelector("[data-viewer-action='reset']")?.addEventListener("click", resetView);
        toolbar?.querySelector("[data-viewer-action='spin']")?.addEventListener("click", () => {
            autoSpin = !autoSpin;
        });

        const animate = () => {
            requestAnimationFrame(animate);

            if (autoSpin && loadedObject) {
                modelGroup.rotation.z += 0.004;
            }

            controls.update();
            renderer.render(scene, camera);
        };

        if (modelType === "step") {
            loadStep();
        } else {
            loadStl();
        }

        resize();
        animate();
        window.addEventListener("resize", resize);
    });
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

initializeSiteTabs();
initializeViewers();
initializeContactForm();
initializeProjectTabs();
initializeProjectCards();
