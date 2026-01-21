let scene, camera, renderer, controls, dragControls;
let draggableObjects = [];
let cassettes = []; 
let selectedCassette = null;
let ytPlayer; 
let isYTReady = false;
let cameraTime = 0;

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-player', {
        height: '0', width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0, 'origin': window.location.origin, 'enablejsapi': 1 },
        events: { 'onReady': () => { isYTReady = true; checkUrlParams(); } }
    });
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 35);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    createSuperNebula(); setupLights();
    createCassette(true);
    window.addEventListener('mousedown', onSelect);
    window.addEventListener('dblclick', onRename);
    window.addEventListener('keydown', (e) => { if (e.key === 'Backspace' || e.key === 'Delete') deleteSelectedCassette(); });
    animate();
}

function checkUrlParams() {
    const p = new URLSearchParams(window.location.search);
    if(p.has('v')) {
        const name = p.get('n') || "COSMIC GIFT";
        const col = parseInt(p.get('c'), 16) || 0x00ffff;
        const vId = p.get('v');
        if(cassettes.length > 0) { scene.remove(cassettes[0].group); draggableObjects = []; cassettes = []; }
        createCassette(true, name, col);
        selectedCassette.ytId = vId; 
        showGiftOverlay(name, vId);
    }
}

function showGiftOverlay(name, vId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-family: 'Courier New', monospace; text-align: center;`;
    overlay.innerHTML = `<h1 style="color: #00ffff; text-shadow: 0 0 20px #00ffff;">YOU RECEIVED A GIFT!</h1><p style="color: white; font-size: 1.5rem;">"${name}"</p><div style="margin-top: 40px; padding: 15px 40px; border: 2px solid white; color: white; border-radius: 50px; font-weight: bold;">TAP TO PLAY</div>`;
    overlay.onclick = () => { if(isYTReady) { ytPlayer.loadVideoById(vId); selectedCassette.isPlaying = true; overlay.remove(); } };
    document.body.appendChild(overlay);
}

function togglePlay() {
    if(!selectedCassette || !selectedCassette.ytId || !isYTReady) return;
    const state = ytPlayer.getPlayerState();
    if(state !== 1) { ytPlayer.playVideo(); selectedCassette.isPlaying = true; document.getElementById('play-btn').innerText = "PAUSE"; }
    else { ytPlayer.pauseVideo(); selectedCassette.isPlaying = false; document.getElementById('play-btn').innerText = "PLAY"; }
}

function setYouTubeURL() {
    if(!selectedCassette) return;
    const url = prompt("PASTE YOUTUBE LINK:");
    if(url) {
        const id = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if(id) { selectedCassette.ytId = id[1]; ytPlayer.loadVideoById(id[1]); selectedCassette.isPlaying = true; document.getElementById('play-btn').innerText = "PAUSE"; }
    }
}

function createCassette(isFirst = false, giftName = null, giftColor = null) {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00];
    const col = giftColor || colors[cassettes.length % colors.length];
    const data = { group, canvas, ctx: canvas.getContext('2d'), texture, name: giftName || "NEW MIXTAPE", color: col, ytId: null, isPlaying: false, bars: [], reels: [] };
    const body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, 4.6, 1.3)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
    group.add(body);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    label.position.set(0, 0.5, 0.66);
    group.add(label);
    const rGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.2, 32);
    const rMat = new THREE.MeshNormalMaterial({opacity: 0.5, transparent: true});
    const rL = new THREE.Mesh(rGeo, rMat); rL.rotation.x = Math.PI/2; rL.position.set(-1.9, 0.2, 0);
    const rR = rL.clone(); rR.position.set(1.9, 0.2, 0);
    group.add(rL, rR);
    data.reels = [rL, rR];
    for(let i = 0; i < 18; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1, 0.25), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 }));
        bar.position.set((i - 8.5) * 0.35, -1.6, 0);
        group.add(bar);
        data.bars.push(bar);
    }
    if(!isFirst) group.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*15, (Math.random()-0.5)*5);
    scene.add(group); draggableObjects.push(group); cassettes.push(data); selectedCassette = data; setupDrag();
}

function drawLabels() {
    cassettes.forEach(c => {
        const ctx = c.ctx; const w = 1024, h = 256;
        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#d35400'); grad.addColorStop(1, '#8e44ad');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        if(c === selectedCassette) { ctx.strokeStyle = 'white'; ctx.lineWidth = 20; ctx.strokeRect(0,0,w,h); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const spaced = c.name.split('').join(' ');
        ctx.fillStyle = 'white';
        let fSize = 80; ctx.font = `bold ${fSize}px Courier New`;
        while(ctx.measureText(spaced).width > 750 && fSize > 20) { fSize -= 2; ctx.font = `bold ${fSize}px Courier New`; }
        ctx.fillText(spaced, w/2, h/2);
        c.texture.needsUpdate = true;
    });
}

function animate() {
    requestAnimationFrame(animate); drawLabels(); cameraTime += 0.005; camera.position.x += Math.sin(cameraTime) * 0.01;
    cassettes.forEach(c => { if (c.isPlaying) { c.reels.forEach(r => r.rotation.z -= 0.07); c.bars.forEach((b, i) => { const s = Math.sin(Date.now() * 0.01 + i) * 2 + 3.5; b.scale.y += (s - b.scale.y) * 0.1; }); } else { c.bars.forEach(b => b.scale.y += (0.1 - b.scale.y) * 0.1); } });
    controls.update(); renderer.render(scene, camera);
}

function sendGift() {
    if(!selectedCassette || !selectedCassette.ytId) { alert("Add music first!"); return; }
    const n = encodeURIComponent(selectedCassette.name); const c = selectedCassette.color.toString(16); const v = selectedCassette.ytId;
    const link = `${window.location.origin}${window.location.pathname}?n=${n}&c=${c}&v=${v}`;
    window.location.href = `mailto:?subject=A cosmic mixtape for you&body=Listen to this: ${link}`;
}

function onSelect(event) {
    const mouse = new THREE.Vector2((event.clientX/window.innerWidth)*2-1, -(event.clientY/window.innerHeight)*2+1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(draggableObjects, true);
    if (intersects.length > 0) { let picked = intersects[0].object; while(picked.parent && !draggableObjects.includes(picked)) picked = picked.parent; selectedCassette = cassettes.find(c => c.group === picked); }
}

function onRename() { if(!selectedCassette) return; const res = prompt("CASSETTE NAME:", selectedCassette.name); if(res) selectedCassette.name = res.toUpperCase(); }

function setupDrag() {
    if(dragControls) dragControls.dispose();
    dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', () => controls.enabled = false);
    dragControls.addEventListener('dragend', () => controls.enabled = true);
    dragControls.addEventListener('drag', (e) => {
        let p = e.object; while(p.parent && !draggableObjects.includes(p)) p = p.parent; const data = cassettes.find(c => c.group === p);
        const ghost = e.object.clone(true); ghost.isGhost = true;
        ghost.traverse(c => { if(c.material) c.material = new THREE.MeshBasicMaterial({ color: data.color, wireframe: true, transparent: true, opacity: 0.1 }); });
        scene.add(ghost);
    });
}

function setupLights() { scene.add(new THREE.AmbientLight(0xffffff, 0.8)); const p = new THREE.PointLight(0xffffff, 1.2); p.position.set(10, 10, 10); scene.add(p); }
function createSuperNebula() { const geo = new THREE.BufferGeometry(); const pos = new Float32Array(10000 * 3); for(let i=0; i<pos.length; i++) pos[i]=(Math.random()-0.5)*400; geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.5 }))); }
function deleteSelectedCassette() { if (!selectedCassette) return; if (ytPlayer && selectedCassette.isPlaying) ytPlayer.stopVideo(); scene.remove(selectedCassette.group); draggableObjects = draggableObjects.filter(obj => obj !== selectedCassette.group); cassettes = cassettes.filter(c => c !== selectedCassette); selectedCassette = cassettes.length > 0 ? cassettes[cassettes.length-1] : null; setupDrag(); }

window.onload = init;
