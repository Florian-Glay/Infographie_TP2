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
    let lines = null;
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
      if (lines) {
        scene.remove(lines);
        lines.geometry.dispose();
        lines.material.dispose();
        lines = null;
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
      updateCurve(1);
      //clearAll();
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
          allLine();
          break;
      }
    }



    function allLine(){
      if (pts.length < 2) return;
      const positions = [];
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i].x;
        const y = pts[i].y;
        positions.push(x, y, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      lines = new THREE.Line(geo, mat);
      scene.add(lines);
    }

    function binom(n,k){
      if(k<0 || k>n) return 0;
      if(k===0 || k===n) return 1;
      if(k>n-k) k = n-k;
      let res = 1;
      for(let j=1; j<=k; j++){
        res = (res*(n - (k - j))) / j;
      }
      return res;
    }

    

    function bernstein(points, t){
      const n = points.length - 1;
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
      if (pts.length < 2) return;

      const steps = 200; // lissage
      const positions = [];
      for(let j=0; j<=steps; j++){
        const t = j/steps;
        const p = bernstein(pts, t);
        positions.push(p.x, p.y, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color:0xffffff });
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