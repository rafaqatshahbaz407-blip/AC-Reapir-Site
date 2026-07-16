/* =========================================================
   AirCare — shared behaviour across all pages
   ========================================================= */

/* Site-wide animated background — softly drifting "cool air" bubbles */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.id = 'bgCanvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if(reduceMotion) return; // leave an empty static canvas

  let w, h, particles;
  const COLORS = ['23,133,70', '222,171,80', '31,131,79'];

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  function makeParticles(){
    const count = window.innerWidth < 700 ? 18 : 34;
    particles = Array.from({length: count}, () => ({
      x: Math.random() * w,
      y: Math.random() * h + h,
      r: 6 + Math.random() * 22,
      speed: 0.15 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.06 + Math.random() * 0.10
    }));
  }
  function tick(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift;
      if(p.y < -40){ p.y = h + 40; p.x = Math.random() * w; }
      if(p.x < -40) p.x = w + 40;
      if(p.x > w + 40) p.x = -40;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(${p.color},${p.alpha})`);
      grad.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  resize();
  makeParticles();
  requestAnimationFrame(tick);
  window.addEventListener('resize', () => { resize(); makeParticles(); });
})();

/* Mobile nav toggle */
(function(){
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if(!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
})();

/* Mark active nav link based on current page */
(function(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    if(a.dataset.page === path) a.classList.add('active');
  });
})();

/* Scroll reveal */
(function(){
  const items = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || !items.length){
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
})();

/* Ambient "cool air" particle fields — populate any .air-field container */
(function(){
  const fields = document.querySelectorAll('.air-field');
  fields.forEach(field => {
    const count = window.innerWidth < 640 ? 8 : 14;
    for(let i=0;i<count;i++){
      const s = document.createElement('span');
      const size = 40 + Math.random()*120;
      s.style.width = size+'px';
      s.style.height = size+'px';
      s.style.left = Math.random()*100+'%';
      s.style.animationDuration = (14 + Math.random()*16)+'s';
      s.style.animationDelay = (Math.random()*-20)+'s';
      field.appendChild(s);
    }
  });
})();

/* Toast helper (global) */
window.showToast = function(message){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span class="toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-msg').textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
};

/* Generic form "submit" simulation for static demo forms */
document.addEventListener('submit', (e) => {
  const form = e.target;
  if(form.matches('[data-demo-form]')){
    e.preventDefault();
    const msg = form.dataset.successMessage || "Thanks! We'll get back to you shortly.";
    window.showToast(msg);
    form.reset();
  }
});

/* Testimonial carousel (home page) */
(function(){
  const track = document.querySelector('[data-testimonial-track]');
  if(!track) return;
  const slides = Array.from(track.children);
  let index = 0;
  const show = (i) => {
    slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
  };
  show(0);
  document.querySelectorAll('[data-testi-next]').forEach(btn => btn.addEventListener('click', () => {
    index = (index + 1) % slides.length; show(index);
  }));
  document.querySelectorAll('[data-testi-prev]').forEach(btn => btn.addEventListener('click', () => {
    index = (index - 1 + slides.length) % slides.length; show(index);
  }));
  let auto = setInterval(() => { index = (index+1) % slides.length; show(index); }, 6000);
  track.addEventListener('mouseenter', () => clearInterval(auto));
})();

/* Before / after comparison slider */
(function(){
  const wrap = document.querySelector('[data-compare]');
  if(!wrap) return;
  const handle = wrap.querySelector('.compare-handle');
  const after = wrap.querySelector('.compare-after');
  let dragging = false;

  const setPos = (clientX) => {
    const rect = wrap.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(2, Math.min(98, pct));
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = pct + '%';
  };

  const start = () => dragging = true;
  const stop = () => dragging = false;
  const move = (e) => {
    if(!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setPos(x);
  };

  handle.addEventListener('mousedown', start);
  handle.addEventListener('touchstart', start, {passive:true});
  window.addEventListener('mouseup', stop);
  window.addEventListener('touchend', stop);
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  wrap.addEventListener('click', (e) => setPos(e.clientX));
})();

/* Set current year in footer */
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
