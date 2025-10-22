// --- scène de base --------------------------------------------------------
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Caméra orthographique = 1 unité monde = 1 pixel à z=0 → facile pour diam=10
    let camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2,window.innerHeight/2, -window.innerHeight/2,0.1, 10);
    camera.position.set(0,0,1);
    camera.lookAt(0,0,0);

    const pointsGroup = new THREE.Group();  // groupe de points rouges
    scene.add(pointsGroup);
    let curveLine = null;
    let pts = [];

    function makeRedDot(x, y) { 
      // cercle de rayon 5 px (diamètre 10 px)
      const geom = new THREE.CircleGeometry(5, 32);
      const mat  = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      const m = new THREE.Mesh(geom, mat);
      m.position.set(x, y, 0);
      return m;
    }

    function clearCurve() {
      if (curveLine) {
        scene.remove(curveLine);
        curveLine.geometry.dispose();
        curveLine.material.dispose();
        curveLine = null;
      }
    }

    function clearAll() {
      pts = [];
      clearCurve();
      // vider les meshes de points
      while (pointsGroup.children.length) {
        const m = pointsGroup.children.pop();
        m.geometry.dispose();
        m.material.dispose();
      }
    }

    function addPoint(x, y) {
      pts.push(new THREE.Vector2(x, y));
      pointsGroup.add(makeRedDot(x, y));
      updateCurve(0);
    }

    // Courbe de Béizers
    function updateCurve(option) {
      clearCurve();
      switch(option) {
        default:
          allLine();
          break;
        case 1:
          bezier();
          break;
      }
    }

    function allLine(){
      if (pts.length < 2) return;

      const positions = [];

      for (let i = 0; i < pts.length - 1; i++) {
        const x = pts[i].x;
        const y = pts[i].y;
        positions.push(x, y, 0);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
      curveLine = new THREE.Line(geo, mat);
      scene.add(curveLine);
    }

    function bezier(){
      if (pts.length < 2) return;

      const positions = [];

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = (i > 0) ? pts[i-1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i+1];
        const p3 = (i + 2 < pts.length) ? pts[i+2] : pts[i+1];

        const b0 = p1.clone();
        const b1 = p1.clone().add( p2.clone().sub(p0).multiplyScalar(1/6) );
        const b2 = p2.clone().sub( p3.clone().sub(p1).multiplyScalar(1/6) );
        const b3 = p2.clone();

        // échantillonnage de la courbe cubique de Bézier; n=3
        const steps = 24; // lissage
        for (let j = 0; j <= steps; j++) {
          const t = j / steps; // Var de temps
          const umt = 1 - t; // un moins t
          const umt2 = umt * umt; // un moins t au carré
          const t2 = t * t; // t carré
          const x = umt2*umt * b0.x + 3*umt2*t * b1.x + 3*umt*t2 * b2.x + t2*t * b3.x;
          const y = umt2*umt * b0.y + 3*umt2*t * b1.y + 3*umt*t2 * b2.y + t2*t * b3.y;
          positions.push(x, y, 0);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
      curveLine = new THREE.Line(geo, mat);
      scene.add(curveLine);
    }

    // Placer un point
    renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) - rect.width  / 2;
      const y = (rect.height / 2) - (e.clientY - rect.top);
      addPoint(x, y);
    });

    // Clear la fenêtre
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        clearAll();
      }
    });

    // Redimensionner la fenêtre (C'est optionnel mais j'aime bien)
    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.left   = -window.innerWidth / 2;
      camera.right  =  window.innerWidth / 2;
      camera.top    =  window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;
      camera.updateProjectionMatrix();
      updateCurve();
    }
    window.addEventListener('resize', onResize);

    // La boucle d'affichage
    (function animate(){
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    })();