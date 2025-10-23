// --- scène de base --------------------------------------------------------
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Caméra orthographique
let camera = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2,window.innerHeight / 2, -window.innerHeight / 2,  0.1, 10);
camera.position.set(0, 0, 1);
camera.lookAt(0, 0, 0);

// Plan invisible pour le Raycaster (z=0)
const planGeometry = new THREE.PlaneGeometry(2000, 2000);
const planMaterial = new THREE.MeshBasicMaterial({ visible: false });
const plan = new THREE.Mesh(planGeometry, planMaterial);
scene.add(plan);

const pointsGroup = new THREE.Group();  // groupe de points rouges
scene.add(pointsGroup);
let curveLine = null;
let lines = null;
let pts = [];

// Objet THREE.Points pour afficher les points
const pointsGeometry = new THREE.BufferGeometry();
const pointsMaterial = new THREE.PointsMaterial({color: 0xff0000,size: 10,});
const points = new THREE.Points(pointsGeometry, pointsMaterial);
scene.add(points);

// Fonction pour créer un cercle rouge (optionnel)
function makeRedDot(x, y) {
  const geom = new THREE.CircleGeometry(5, 32); // rayon 5
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3333 }); // couleur rouge
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, 0);
  return m;
}

// Effacer la courbe
function clearCurve() {
  if (lines) {
    scene.remove(lines); // Polygone de  controle
    lines.geometry.dispose();
    lines.material.dispose();
    lines = null;
  }
  if (curveLine) {
    scene.remove(curveLine);
    curveLine.geometry.dispose(); // coubre de bézier
    curveLine.material.dispose();
    curveLine = null;
  }
}

// Effacer tous les points
function clearAll() {
  pts = []; // Vider les points THREE.Points
  clearCurve(); 
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  while (pointsGroup.children.length) { // Vider les cercles rouges (optionnel)
    const m = pointsGroup.children.pop();
    m.geometry.dispose();
    m.material.dispose();
  }
}

// Ajouter un point
function addPoint(x, y) {
  pts.push(new THREE.Vector2(x, y));// Ajouter un cercle rouge
  pointsGroup.add(makeRedDot(x, y));
  updatePointsGeometry();// Mettre à jour la géométrie des points
  updateCurve();
}

// Mettre à jour la géométrie des points
function updatePointsGeometry() {
  const positions = [];
  for (const pt of pts) {
    positions.push(pt.x, pt.y, 0);
  }
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
}

// Courbe de Bézier
function updateCurve() {
  clearCurve();
  bezier();
  allLine();
}

function allLine(){
    if (pts.length < 2) return; // si on a pas de droite
    const positions = [];
    for (let i = 0; i < pts.length; i++) { // on parcourt tout les points
        const x = pts[i].x;
        const y = pts[i].y;
        positions.push(x, y, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    lines = new THREE.Line(geo, mat); // on crée les polygones de controle
    scene.add(lines);
}

// Binome de Newton
function binom(n,k){ 
    if(k<0 || k>n) return 0;
    if(k===0 || k===n) return 1;
    if(k>n-k) k = n-k;
    let res = 1;
    for(let j=1; j<=k; j++){ // Boucle pour les coeff
        res = (res*(n - (k - j))) / j;
    }
    return res;
}


function bernstein(points, t){
    const n = points.length - 1;
    // condition pour avoir assez de points
    if (n < 1) return new THREE.Vector2();
    if (t<=0) return points[0].clone();
    if (t>=1) return points[n].clone();

    let x = 0, y = 0;
    const umt = 1 - t;
    // on peut calculer directement C(n,i) t^i (1-t)^(n-i)
    for(let i=0; i<=n; i++){
        const w = binom(n, i) * Math.pow(t, i) * Math.pow(umt, n - i);
        x += points[i].x * w;
        y += points[i].y * w;
    }
    return new THREE.Vector2(x, y);
}

function bezier(){
    if (pts.length < 2) return; // pour avoir une coubre

    const steps = 200; // lissage -> ajustable si on veut plus de précision
    const positions = [];
    for(let j=0; j<=steps; j++){
        const t = j/steps;
        const p = bernstein(pts, t);
        positions.push(p.x, p.y, 0); // On défini un très grand nombre de points
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color:0xffffff }); // couleur blanche
    curveLine = new THREE.Line(geo, mat);
    scene.add(curveLine);
}

// Placer un point avec Raycaster
renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    // definir le centre des coordonnées
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plan);
    // on s'est répéré dans l'espace grace au plan invisible créé au début 
    if (intersects.length > 0) {
        const point = intersects[0].point;
        addPoint(point.x, point.y);
    }
});

// Effacer avec la touche 'r'
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    clearAll();
  }
});

// Redimensionner la fenêtre
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.left   = -window.innerWidth / 2;
  camera.right  =  window.innerWidth / 2;
  camera.top    =  window.innerHeight / 2;
  camera.bottom = -window.innerHeight / 2;
  camera.updateProjectionMatrix();
  updateCurve(); // remettre en place les courbes car les répère ont changé
}
window.addEventListener('resize', onResize);

// Boucle d'affichage
(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})();