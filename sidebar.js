/*  Extension de la sidebar – s'appuie sur les variables/fonctions
    globales créées par TON premierProjet.js (renderer, scene, pointsGroup, pts, curveLine, addPoint, updateCurve, clearCurve, clearAll, camera)
    >>> Aucun changement dans ton fichier de base.  <<<  */

// --------- Helpers DOM ----------
const $ = (id) => document.getElementById(id);
const sidebar = $("sidebar"), toggleBtn = $("toggle"), reopenBtn = $("reopen");
const modeSel = $("mode"), statusEl = $("status");
const tabBtns = [$("curve1"), $("curve2"), $("curve3")];
const xInput = $("xInput"), yInput = $("yInput"), addXYBtn = $("addXY");
const clearActiveBtn = $("clearActive");
function setStatus(t){ statusEl.textContent = t; }

// --------- ÉTAT MULTI-COURBES ----------
/* On conserve ta courbe existante comme Courbe 1.
   Pour Courbe 2 et 3, on crée des états séparés (points + meshes + line). */
const curveStates = [
  { ptsRef: pts, lineRef: () => curveLine, setLine: v => (curveLine = v), meshes: Array.from(pointsGroup.children) },
  { ptsRef: [],  line: null, lineRef: function(){return this.line;}, setLine: function(v){this.line = v;}, meshes: [] },
  { ptsRef: [],  line: null, lineRef: function(){return this.line;}, setLine: function(v){this.line = v;}, meshes: [] },
];
let activeCurve = 0;

// On garde des références sur TES fonctions pour les réutiliser/étendre
const _updateCurve = updateCurve;
const _clearCurve  = clearCurve;
const _clearAll    = clearAll;
const _addPoint    = addPoint;

// --------- SURCOUCHES LÉGÈRES ----------
/* 1) updateCurve : appelle ta version puis mémorise la line dans l’état actif
      et ajuste la visibilité des autres lignes */
window.updateCurve = function(){
  _updateCurve(); // TA logique de Bézier
  curveStates[activeCurve].setLine(curveLine);
  // mettre à jour la visibilité de toutes les lines
  curveStates.forEach((st,i) => {
    const l = st.lineRef();
    if (l) l.visible = (i === activeCurve);
  });
};

/* 2) Effacer uniquement la courbe active (bouton) */
function clearActive(){
  // retirer les meshes visibles du groupe (sans dispose car on va les détruire proprement)
  while (pointsGroup.children.length) {
    const m = pointsGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
  // vider les données
  curveStates[activeCurve].ptsRef.length = 0;
  const l = curveStates[activeCurve].lineRef();
  if (l) {
    scene.remove(l);
    if (l.geometry) l.geometry.dispose();
    if (l.material) l.material.dispose();
    curveStates[activeCurve].setLine(null);
  }
  curveStates[activeCurve].meshes = [];
  setStatus(`Courbe ${activeCurve+1} effacée.`);
}

/* 3) Effacer TOUT (touche R) – on étend ta clearAll */
window.clearAll = function(){
  // on nettoie les 3
  for (let i=0;i<curveStates.length;i++){
    activeCurve = i;
    clearActive();
  }
  activeCurve = 0;
  setActiveCurve(0);
  setStatus("Toutes les courbes ont été effacées.");
};

/* 4) Ajout par coordonnées sur la courbe active
      → utilise TON addPoint, puis tag le mesh ajouté et le mémorise */
function addPointToActive(x, y){
  const before = pointsGroup.children.length;
  _addPoint(x, y); // push dans pts (redirigé), puis updateCurve()
  const m = pointsGroup.children[pointsGroup.children.length - 1];
  const idx = curveStates[activeCurve].ptsRef.length - 1;
  if (m) { m.userData.index = idx; m.userData.curve = activeCurve; }
  if (pointsGroup.children.length > before) {
    curveStates[activeCurve].meshes.push(m);
  }
}

/* 5) Switch de courbe : on redirige la variable globale pts vers l’état choisi,
      on masque/affiche les lines, et on remonte les bons meshes dans pointsGroup */
function setActiveCurve(idx){
  activeCurve = idx;
  // redirige la référence globale "pts" pour que TES fonctions l'utilisent
  pts = curveStates[idx].ptsRef;

  // gérer la visibilité des lignes
  curveStates.forEach((st,i) => {
    const l = st.lineRef();
    if (l) l.visible = (i === idx);
  });

  // remplacer les points visibles
  while (pointsGroup.children.length) {
    pointsGroup.remove(pointsGroup.children[pointsGroup.children.length - 1]);
  }
  curveStates[idx].meshes.forEach(m => pointsGroup.add(m));

  // UI onglets
  tabBtns.forEach((b,i)=> b.classList.toggle("active", i===idx));

  setStatus(`Courbe ${idx+1} active.`);
  // redessine proprement
  updateCurve();
}

// --------- UI: Sidebar ----------
toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  reopenBtn.classList.toggle("visible", sidebar.classList.contains("collapsed"));
});
reopenBtn.addEventListener("click", () => {
  sidebar.classList.remove("collapsed");
  reopenBtn.classList.remove("visible");
});
tabBtns.forEach(btn => btn.addEventListener("click", () => setActiveCurve(Number(btn.dataset.curve))));
addXYBtn.addEventListener("click", () => {
  const x = Number(xInput.value), y = Number(yInput.value);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    addPointToActive(x, y);
    setStatus(`Point ajouté (${x}, ${y}) sur Courbe ${activeCurve+1}`);
    xInput.value=""; yInput.value="";
  } else {
    setStatus("X/Y invalides.");
  }
});
clearActiveBtn.addEventListener("click", clearActive);

// --------- Mode déplacer (drag) ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
let dragging = null;

function screenToWorld(e){
  ndc.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const out = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, out);
  return out;
}
function pickActivePoint(e){
  ndc.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(curveStates[activeCurve].meshes, false);
  return hits.length ? hits[0].object : null;
}

/* Astuce : on intercepte pointerdown en phase "capture" pour
   empêcher l'ajout de point quand on est en mode Déplacer. */
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (modeSel.value === 'move') {
    e.stopImmediatePropagation(); e.preventDefault();
    const hit = pickActivePoint(e);
    if (hit) { dragging = hit; setStatus("Déplacement…"); }
  } else {
    // mode placer : on laisse TON listener créer le point,
    // puis on enregistre le mesh et on le tag dans l'état actif
    const before = pointsGroup.children.length;
    setTimeout(() => {
      if (pointsGroup.children.length > before) {
        const m = pointsGroup.children[pointsGroup.children.length - 1];
        const idx = curveStates[activeCurve].ptsRef.length - 1;
        if (m) { m.userData.index = idx; m.userData.curve = activeCurve; }
        curveStates[activeCurve].meshes.push(m);
      }
    });
  }
}, true); // phase capture

window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = screenToWorld(e);
  dragging.position.x = p.x;
  dragging.position.y = p.y;

  const i = dragging.userData.index;
  if (i != null && curveStates[activeCurve].ptsRef[i]) {
    curveStates[activeCurve].ptsRef[i].set(p.x, p.y);
    updateCurve();
  }
});

window.addEventListener('pointerup', () => {
  if (dragging) setStatus("Point déplacé.");
  dragging = null;
});

// --------- Initialisation ----------
setActiveCurve(0);
setStatus("Prêt.");
