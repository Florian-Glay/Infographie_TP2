// Ici on défini quels éléments HTML on va utiliser pour la section Bézier
const bezierElements = {
    canvas: document.getElementById('bezierCanvas'),
    manualForm: document.getElementById('manualPointForm'),
    coordX: document.getElementById('coordX'),
    coordY: document.getElementById('coordY'),
    controlList: document.getElementById('controlPointsList'),
    status: document.getElementById('bezierStatus'),
    slider: document.getElementById('stepSlider'),
    sliderValue: document.getElementById('stepValue'),
    clearBtn: document.getElementById('clearBezier'),
    transformBtn: document.getElementById('applyTransform'),
    translateX: document.getElementById('translateX'),
    translateY: document.getElementById('translateY'),
    scale: document.getElementById('scale'),
    rotation: document.getElementById('rotation')
    };

// Voici notre fonction principale pour Bézier
function setupBezierSection() {
    const { canvas, controlList, status, slider, sliderValue } = bezierElements;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010b1f);

    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20); // Définir l'angle de vision de la cam
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const grid = new THREE.GridHelper(4, 8, 0x334155, 0x1e293b); // Grille en fond
    grid.rotateX(Math.PI / 2);
    grid.material.transparent = true;
    grid.material.opacity = 0.8;
    grid.position.z = -0.01;
    scene.add(grid); // ajout à la scène


    // Nos états pour les actions en cours
    const state = {
        controlPoints: [], // Nos points
        dragIndex: -1, // Si l'on déplace un point
        tValue: 0.5 //La valeur de Casteljau
    };

    // Le plan
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();

    // Le point qui sera utilisé
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0xf97316, size: 18 });
    const pointsCloud = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointsCloud);

    // La ligne qui relie directement les points de contrôle
    const polygonGeometry = new THREE.BufferGeometry();
    const polygonMaterial = new THREE.LineDashedMaterial({ color: 0x22d3ee, dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.8 });
    const polygonLine = new THREE.Line(polygonGeometry, polygonMaterial);
    scene.add(polygonLine);

    // La courbe de Bézier
    const curveGeometry = new THREE.BufferGeometry();
    const curveMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const curveLine = new THREE.Line(curveGeometry, curveMaterial);
    scene.add(curveLine);

    // Accumulateur de De Casteljau
    const stepsGroup = new THREE.Group();
    scene.add(stepsGroup);

    // Phrase de contexte dans le site
    function updateStatus() {
        const n = state.controlPoints.length;
        status.textContent = n === 0 ? '0 point — ajoutez-en via le formulaire ou un clic.' : `${n} point${n > 1 ? 's' : ''} de contrôle`;
    }

    // Mise à jour de la liste des point, visuellement par un tableau dans le site
    function refreshControlList() {
        controlList.innerHTML = '';
        state.controlPoints.forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between text-sm border-b border-slate-800 py-1';
            li.innerHTML = `<span class="text-slate-400">P${idx}</span><span class="text-slate-100">(${p.x.toFixed(2)}, ${p.y.toFixed(2)})</span>`;
            controlList.appendChild(li);
        });
        if (!state.controlPoints.length) {
            const li = document.createElement('li');
            li.className = 'text-slate-500';
            li.textContent = 'Ajoutez des points pour générer la courbe.';
            controlList.appendChild(li);
        }
        updateStatus();
    }

    // Update des points de contrôles
    function updatePointsGeometry() {
        if (!state.controlPoints.length) { // Pas de point alors on fait rien
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return;
        }
        // Sinon mise à jour de la géométrie
        const positions = new Float32Array(state.controlPoints.length * 3);
        state.controlPoints.forEach((p, idx) => {
            // Pour chaque point, on met dans positions le x le y et le z par deéfaut à 0
            positions[idx * 3] = p.x; 
            positions[idx * 3 + 1] = p.y;
            positions[idx * 3 + 2] = 0;
        });
        // On met à jour la géo par le tableau de positions
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        pointsGeometry.computeBoundingSphere(); // Permet de mettre à jour le raycaster des points
    }

    // Update des polygones de contrôle
    function updatePolygon() {
        if (state.controlPoints.length < 2) { // Si c'est vide alors on fait rien
        polygonGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return;
        }
        // Sinon on met à jour
        // Ici il y a n-1 position car on relit les pts. un segment est constitué de 2 pts et un pts de 3 coordonnées
        const positions = new Float32Array((state.controlPoints.length - 1) * 2 * 3);
        let ptr = 0;
        // On parcourt les points de contrôle
        for (let i = 0; i < state.controlPoints.length - 1; i += 1) {
            const a = state.controlPoints[i];
            const b = state.controlPoints[i + 1];
            positions[ptr++] = a.x; positions[ptr++] = a.y; positions[ptr++] = 0; // 1er pt
            positions[ptr++] = b.x; positions[ptr++] = b.y; positions[ptr++] = 0; // 2eme pt
        }
        // On met à jour la geo
        polygonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        polygonGeometry.computeBoundingSphere(); // Permet de mettre à jour le raycaster des lignes
        polygonLine.computeLineDistances(); // Ligne affichée en tiret
    }

    // Algorithme de De Casteljau
    function deCasteljau(points, t) {
        // Si on a pas de point alors on fait rien
        if (!points.length) return null;

        let temp = points.map((p) => p.clone()); // On clone tout les points pour modifier ailleurs
        while (temp.length > 1) { // Tant qu'il reste un point à étudier
            const next = []; // Tableau temporaire pour stocker les points intermédiaires
            for (let i = 0; i < temp.length - 1; i += 1) {
                const interpolated = temp[i].clone().lerp(temp[i + 1], t);
                // lerp permet de faire : (1−t)*temp[i]+t*temp[i+1]
                // On met deans interpolated le point intermédiaire entre temp[i] et temp[i+1]
                next.push(interpolated);
            }
            temp = next; // On remplace temp par les nouveaux points
        }
        return temp[0]; // Le dernier point restant est le point sur la courbe pour le paramètre t
    }

    // On calcule chaque étpae de De Casteljau : Permet l'affichage des étapes
    function computeSteps(points, t) {
        const steps = []; // Nouveau tab
        if (points.length < 2) return steps; // Si pas assez de point, on fait rien
        let temp = points.map((p) => p.clone()); // On clone les pts
        while (temp.length > 1) { // Tant qu'il reste un point à étudier
            const segments = []; // Liste des segments
            const next = []; // Les nouveaux points intermédiaires initialisés
            for (let i = 0; i < temp.length - 1; i += 1) {
                segments.push([temp[i].clone(), temp[i + 1].clone()]); // Segment entre deux points
                next.push(temp[i].clone().lerp(temp[i + 1], t)); // (1−t)*temp[i]+t*temp[i+1]
            }
            steps.push({ segments, points: next }); // On mémorise ce niveau : segments + points
            temp = next; // On continue avec les nouveaux points
        }
        return steps; // On renvoie toutes les étapes pour affichage
    }

    // COURBE DE BÉZIER
    function updateCurve() {
        if (state.controlPoints.length < 2) { // Si pas assez de pts on fait rien
            curveGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return;
        }
        const segments = 120; // On lisse avec 120 segments
        const positions = new Float32Array(segments * 3); // 1 pt = 3 coordonnées
        for (let i = 0; i < segments; i += 1) { // pour chaque segment
            const t = i / (segments - 1); // t varie entre 0 et 1 selon l'étape à la quelle on est (notre i)
            // On prned tout nos points de controle et on calcule le point sur la courbe pour ce t avec De Casteljau
            const point = deCasteljau(state.controlPoints, t); 
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = 0;
        }
        // On met à jour la géométrie de la courbe et raycaster
        curveGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        curveGeometry.computeBoundingSphere();
    }

    // On dessine les segments intermédiaires de De Casteljau
    function updateStepsVisualization() {
        // On supprime tout ce qu’il y avait dedans
        while (stepsGroup.children.length) {
            const child = stepsGroup.children[0];
            stepsGroup.remove(child); // On a bien enlevé de la scène
            // Mais il faut aussi libérer la mémoire
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        if (state.controlPoints.length < 2) return; // SI on a pas assez de pts alors on fait rien
        const colors = [0x475569, 0x94a3b8, 0xfde68a, 0xf97316]; // On choisit des couleurs pour les étapes
        const steps = computeSteps(state.controlPoints, state.tValue); // On appel toute les étapes de De Casteljau
        steps.forEach((step, idx) => {
            // Pour chaque étape on dessine chaque segment
            step.segments.forEach((segment) => { // segment = [ptA, ptB]
                const geometry = new THREE.BufferGeometry().setFromPoints(segment); // On fait ça géo
                const material = new THREE.LineBasicMaterial({ // On fait son material
                    color: colors[idx % colors.length],
                    transparent: true,
                    opacity: 0.65
                });
                const line = new THREE.Line(geometry, material); // On crée la ligne
                stepsGroup.add(line); // On l'ajoute au groupe
            });
        });
    }

    // MISE A JOUR COMPLETE
    function updateAll() {
        updatePointsGeometry(); // PTS
        updatePolygon(); // LINE
        updateCurve(); // BEZIER
        updateStepsVisualization(); // ETAPES DE CASTELJAU
        refreshControlList(); // INDICATEUR DE PTS
    }

    // Obtenir le point dans le plan à partir de la souris
    function getWorldPointFromEvent(event) {
        const rect = canvas.getBoundingClientRect(); // Taille du canvas
        const souris = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1, // Coor x normée entre -1 et 1
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1 // Coor y normée entre -1 et 1
        };
        raycaster.setFromCamera(souris, camera); // raycaster
        const target = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, target)) { // vérifier l'intersection avec le plan
            return target; // On renvoie le point d'intersection
        }
        return null;
    }

    // Trouver l'index du point proche
    function findPointIndex(worldPoint, threshold = 0.08) {
        let found = -1; // Valeur de l'erreur
        let minDist = Infinity; // Distance min initialisée à l'infini
        state.controlPoints.forEach((p, idx) => { // Pour chaque point de contrôle
            const dist = p.distanceTo(worldPoint); // distance
            if (dist < threshold && dist < minDist) { // Si on est proche et que c'est la plus proche
                found = idx; // nouvel index
                minDist = dist; // nouvelle distance min
            }
        });
        return found; // Soit le point est trouvé soit erreur = -1
    }

    let pointerId = null; // ID du pointeur en cours de drag

    // Placer un point ou commencer un drag
    canvas.addEventListener('pointerdown', (event) => { 
        const worldPoint = getWorldPointFromEvent(event);
        if (!worldPoint) return;
        const idx = findPointIndex(worldPoint);
        if (idx !== -1) {
            state.dragIndex = idx;
            pointerId = event.pointerId;
            canvas.setPointerCapture(pointerId);
        }
        else {
            state.controlPoints.push(worldPoint);
            updateAll();
        }
    });

    canvas.addEventListener('pointermove', (event) => {
        if (state.dragIndex === -1) return;
        const worldPoint = getWorldPointFromEvent(event);
        if (!worldPoint) return;
        state.controlPoints[state.dragIndex].copy(worldPoint);
        updateAll();
    });

    function releaseDrag() {
        if (pointerId !== null) {
        try { canvas.releasePointerCapture(pointerId); } catch (e) { /* ignore */ }
        pointerId = null;
        }
        state.dragIndex = -1;
    }

    canvas.addEventListener('pointerup', releaseDrag);
    canvas.addEventListener('pointerleave', releaseDrag);

    slider.addEventListener('input', () => {
        state.tValue = slider.value / 100;
        sliderValue.textContent = state.tValue.toFixed(2);
        updateCurve();
        updateStepsVisualization();
    });

    bezierElements.manualForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const x = parseFloat(bezierElements.coordX.value);
        const y = parseFloat(bezierElements.coordY.value);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        state.controlPoints.push(new THREE.Vector3(x, y, 0));
        updateAll();
        event.target.reset();
    });

    bezierElements.clearBtn.addEventListener('click', () => {
        state.controlPoints = [];
        updateAll();
    });

    const presets = {
        courbe1: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
        ],
        courbe2: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
        ],
        courbe3: [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0]
        ]
    };

    document.querySelectorAll('[data-preset]').forEach((button) => {
        button.addEventListener('click', () => {
        const key = button.getAttribute('data-preset');
        const preset = presets[key];
        if (!preset) return;
        state.controlPoints = preset.map(([x, y]) => new THREE.Vector3(x, y, 0));
        updateAll();
        });
    });

    bezierElements.transformBtn.addEventListener('click', () => {
        if (!state.controlPoints.length) return;
        const dx = parseFloat(bezierElements.translateX.value) || 0;
        const dy = parseFloat(bezierElements.translateY.value) || 0;
        const scale = parseFloat(bezierElements.scale.value) || 1;
        const angleDeg = parseFloat(bezierElements.rotation.value) || 0;
        const angle = THREE.MathUtils.degToRad(angleDeg);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        state.controlPoints.forEach((p) => {
        const scaledX = p.x * scale;
        const scaledY = p.y * scale;
        const rotatedX = scaledX * cos - scaledY * sin;
        const rotatedY = scaledX * sin + scaledY * cos;
        p.x = rotatedX + dx;
        p.y = rotatedY + dy;
        });
        updateAll();
    });

    function resizeRenderer() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        const viewSize = 4;
        const aspect = width / height;
        camera.left = (-viewSize * aspect) / 2;
        camera.right = (viewSize * aspect) / 2;
        camera.top = viewSize / 2;
        camera.bottom = -viewSize / 2;
        camera.updateProjectionMatrix();
        }
    }

    updateAll();
    slider.dispatchEvent(new Event('input'));
    state.controlPoints = presets.courbe1.map(([x, y]) => new THREE.Vector3(x, y, 0));
    updateAll();

    return {
        render() {
        resizeRenderer();
        renderer.render(scene, camera);
        }
    };
}

const bezierApp = setupBezierSection();

function renderLoop() {
    requestAnimationFrame(renderLoop);
    bezierApp.render();
}

renderLoop();