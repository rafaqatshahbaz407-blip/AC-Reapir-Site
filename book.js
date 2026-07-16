/* =========================================================
   AirCare — Book Service page logic
   ========================================================= */
(function(){
  const form = document.getElementById('bookingForm');
  if(!form) return;

  const steps = Array.from(document.querySelectorAll('.form-step'));
  const dots = Array.from(document.querySelectorAll('[data-step-dot]'));
  let current = 1;

  /* Pre-select service from ?service= query param coming from the Services page */
  const params = new URLSearchParams(location.search);
  const svcParam = params.get('service');
  const svcMap = {
    'deep-cleaning':'AC Deep Cleaning', 'gas-filling':'Gas Filling', 'installation':'AC Installation',
    'repair':'AC Repair', 'duct-cleaning':'Duct Cleaning', 'amc':'AMC Plan'
  };
  if(svcParam && svcMap[svcParam]){
    const sel = document.getElementById('serviceType');
    sel.value = svcMap[svcParam];
  }

  function goToStep(n){
    steps.forEach(s => s.hidden = Number(s.dataset.step) !== n);
    dots.forEach(d => {
      const dn = Number(d.dataset.stepDot);
      d.classList.toggle('active', dn === n);
      d.classList.toggle('done', dn < n);
    });
    current = n;
    if(n === 3) buildReview();
    window.scrollTo({ top: form.offsetTop - 110, behavior:'smooth' });
  }

  function validateStep(n){
    if(n === 1){
      const svc = document.getElementById('serviceType');
      if(!svc.value){ svc.focus(); window.showToast('Please select a service type.'); return false; }
    }
    if(n === 2){
      const name = document.getElementById('fullName');
      const phone = document.getElementById('phone');
      if(!name.value.trim()){ name.focus(); window.showToast('Please enter your full name.'); return false; }
      if(!phone.value.trim()){ phone.focus(); window.showToast('Please enter your phone number.'); return false; }
    }
    return true;
  }

  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
    if(validateStep(current)) goToStep(Math.min(current+1, 3));
  }));
  document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', () => {
    goToStep(Math.max(current-1, 1));
  }));

  /* Unit quantity stepper */
  const qtyInput = document.getElementById('unitCount');
  document.querySelector('[data-qty-minus]').addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    updateSummary();
  });
  document.querySelector('[data-qty-plus]').addEventListener('click', () => {
    qtyInput.value = Math.min(10, Number(qtyInput.value) + 1);
    updateSummary();
  });

  /* File upload preview */
  const uploadBox = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('uploadPreview');
  uploadBox.addEventListener('click', () => fileInput.click());
  ['dragenter','dragover'].forEach(evt => uploadBox.addEventListener(evt, e => { e.preventDefault(); uploadBox.classList.add('drag'); }));
  ['dragleave','drop'].forEach(evt => uploadBox.addEventListener(evt, e => { e.preventDefault(); uploadBox.classList.remove('drag'); }));
  uploadBox.addEventListener('drop', e => { handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(fileList){
    Array.from(fileList).slice(0,6).forEach(file => {
      if(!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        thumb.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><button type="button" aria-label="Remove">✕</button>`;
        thumb.querySelector('button').addEventListener('click', () => thumb.remove());
        preview.appendChild(thumb);
      };
      reader.readAsDataURL(file);
    });
  }

  /* Promo code */
  let discount = 0;
  document.getElementById('applyPromo').addEventListener('click', () => {
    const code = document.getElementById('promo').value.trim().toUpperCase();
    if(code === 'AIR10'){
      discount = 0.10;
      window.showToast('Promo applied — 10% off!');
    } else if(code === ''){
      window.showToast('Enter a promo code first.');
      return;
    } else {
      discount = 0;
      window.showToast('Invalid promo code.');
    }
    updateSummary();
  });

  /* Live order summary */
  const summaryEmpty = document.getElementById('summaryEmpty');
  const summaryContent = document.getElementById('summaryContent');

  function updateSummary(){
    const svcSel = document.getElementById('serviceType');
    const opt = svcSel.options[svcSel.selectedIndex];
    const price = opt && opt.dataset.price ? Number(opt.dataset.price) : 0;
    const units = Number(qtyInput.value || 1);
    const acType = document.getElementById('acType').value;
    const date = document.getElementById('prefDate').value;
    const time = document.getElementById('prefTime').value;
    const loc = document.getElementById('address').value || (window.__pickedLocation ? window.__pickedLocation.label : '');

    if(!svcSel.value){
      summaryEmpty.style.display = 'block';
      summaryContent.style.display = 'none';
      return;
    }
    summaryEmpty.style.display = 'none';
    summaryContent.style.display = 'block';

    document.getElementById('sumService').textContent = svcSel.value;
    document.getElementById('sumType').textContent = acType || '—';
    document.getElementById('sumUnits').textContent = units;
    document.getElementById('sumDate').textContent = (date || time) ? `${date || '—'} ${time || ''}`.trim() : '—';
    document.getElementById('sumLoc').textContent = loc || '—';

    const subtotal = price * units;
    const discountAmt = Math.round(subtotal * discount);
    document.getElementById('sumDiscount').textContent = discountAmt ? `- PKR ${discountAmt.toLocaleString()}` : 'PKR 0';
    document.getElementById('sumTotal').textContent = `PKR ${(subtotal - discountAmt).toLocaleString()}`;
  }

  ['serviceType','acType','acBrand','prefDate','prefTime','address'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateSummary);
    document.getElementById(id).addEventListener('input', updateSummary);
  });
  updateSummary();

  /* ---------------- SHARE LIVE LOCATION (quick, no modal) ---------------- */
  const shareLiveBtn = document.getElementById('shareLiveLocationBtn');
  shareLiveBtn.addEventListener('click', () => {
    if(!navigator.geolocation){ window.showToast('Geolocation is not supported on this device.'); return; }
    shareLiveBtn.disabled = true;
    const original = shareLiveBtn.innerHTML;
    shareLiveBtn.innerHTML = 'Locating…';
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const label = `My live location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      window.__pickedLocation = { lat, lng, label };
      document.getElementById('address').value = label;
      mapSelectedText.textContent = `Live location shared: ${label}`;
      mapSelectedInfo.style.display = 'flex';
      updateSummary();
      window.showToast('Live location shared successfully.');
      shareLiveBtn.disabled = false;
      shareLiveBtn.innerHTML = original;

      // Best-effort reverse geocode to a readable address
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if(data && data.display_name){
            window.__pickedLocation.label = data.display_name;
            document.getElementById('address').value = data.display_name;
            mapSelectedText.textContent = `Live location shared: ${data.display_name}`;
            updateSummary();
          }
        }).catch(() => {});
    }, () => {
      window.showToast('Could not access your location. Please allow location access or use the map instead.');
      shareLiveBtn.disabled = false;
      shareLiveBtn.innerHTML = original;
    });
  });

  /* ---------------- MAP LOCATION PICKER ---------------- */
  const mapModal = document.getElementById('mapModal');
  const openMapBtn = document.getElementById('openMapBtn');
  const closeMapBtn = document.getElementById('closeMapBtn');
  const confirmMapBtn = document.getElementById('confirmMapBtn');
  const useMyLocationBtn = document.getElementById('useMyLocationBtn');
  const pickerCoords = document.getElementById('pickerCoords');
  const mapSelectedInfo = document.getElementById('mapSelectedInfo');
  const mapSelectedText = document.getElementById('mapSelectedText');
  const addressInput = document.getElementById('address');

  let leafletMap, marker;
  const DEFAULT_LATLNG = [31.5497, 74.3436]; // Lahore, PK

  function showMapFallback(){
    const mapEl = document.getElementById('pickerMap');
    if(mapEl.dataset.fallback) return;
    mapEl.dataset.fallback = '1';
    mapEl.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:24px; text-align:center; background:var(--gray-50);">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--gray-400);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <div style="font-size:13.5px; color:var(--gray-600); max-width:320px;">The map couldn't load on this network. You can still type your address or coordinates directly below.</div>
        <input type="text" id="fallbackAddress" placeholder="e.g. House 12, Gulberg III, Lahore" style="width:100%; max-width:320px; padding:10px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:13.5px;">
      </div>`;
    document.getElementById('fallbackAddress').addEventListener('input', (e) => {
      window.__pickedLocation = { label: e.target.value };
      pickerCoords.textContent = e.target.value || 'No location entered';
    });
  }

  function initMap(){
    if(leafletMap) return;
    if(typeof L === 'undefined'){ showMapFallback(); return; }
    leafletMap = L.map('pickerMap', { zoomControl:true }).setView(DEFAULT_LATLNG, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    marker = L.marker(DEFAULT_LATLNG, { draggable:true }).addTo(leafletMap);
    marker.on('dragend', () => updateCoords(marker.getLatLng()));
    leafletMap.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updateCoords(e.latlng);
    });
    updateCoords({ lat: DEFAULT_LATLNG[0], lng: DEFAULT_LATLNG[1] });
  }

  function updateCoords(latlng){
    pickerCoords.textContent = `Lat: ${latlng.lat.toFixed(4)}, Lng: ${latlng.lng.toFixed(4)}`;
    window.__pickedLocation = { lat: latlng.lat, lng: latlng.lng, label: `Pinned location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})` };
    reverseGeocode(latlng);
  }

  function reverseGeocode(latlng){
    // Best-effort reverse geocode via OpenStreetMap Nominatim; falls back to coordinates if unavailable.
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if(data && data.display_name){
          window.__pickedLocation.label = data.display_name;
          pickerCoords.textContent = data.display_name;
        }
      })
      .catch(() => { /* offline or blocked — coordinates already shown */ });
  }

  openMapBtn.addEventListener('click', () => {
    mapModal.classList.add('open');
    setTimeout(() => {
      initMap();
      if(leafletMap) leafletMap.invalidateSize();
    }, 50);
  });
  closeMapBtn.addEventListener('click', () => mapModal.classList.remove('open'));
  mapModal.addEventListener('click', (e) => { if(e.target === mapModal) mapModal.classList.remove('open'); });

  useMyLocationBtn.addEventListener('click', () => {
    if(!navigator.geolocation){ window.showToast('Geolocation not supported on this device.'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      leafletMap.setView(ll, 15);
      marker.setLatLng(ll);
      updateCoords(ll);
    }, () => window.showToast('Could not access your location.'));
  });

  confirmMapBtn.addEventListener('click', () => {
    if(window.__pickedLocation){
      addressInput.value = window.__pickedLocation.label;
      mapSelectedText.textContent = `Pinned: ${window.__pickedLocation.label}`;
      mapSelectedInfo.style.display = 'flex';
      updateSummary();
    }
    mapModal.classList.remove('open');
  });

  /* ---------------- REVIEW STEP ---------------- */
  function buildReview(){
    const svc = document.getElementById('serviceType').value || '—';
    const acType = document.getElementById('acType').value || '—';
    const acBrand = document.getElementById('acBrand').value || '—';
    const units = qtyInput.value;
    const date = document.getElementById('prefDate').value || '—';
    const time = document.getElementById('prefTime').value || '—';
    const name = document.getElementById('fullName').value || '—';
    const phone = document.getElementById('phone').value || '—';
    const email = document.getElementById('email').value || '—';
    const address = document.getElementById('address').value || '—';
    const payment = document.querySelector('input[name=payment]:checked').value;

    const rows = [
      ['Service', svc], ['AC Type', acType], ['AC Brand', acBrand], ['Units', units],
      ['Date & Time', `${date} ${time}`], ['Name', name], ['Phone', phone], ['Email', email],
      ['Location', address], ['Payment Method', payment]
    ];
    document.getElementById('reviewBlock').innerHTML = rows.map(([k,v]) => `
      <div style="display:flex; justify-content:space-between; padding:10px 14px; background:var(--gray-50); border-radius:10px;">
        <span style="color:var(--gray-600);">${k}</span><span style="font-weight:600;">${v}</span>
      </div>`).join('');
  }

  /* ---------------- SEND TO WHATSAPP ---------------- */
  const WHATSAPP_NUMBER = '923091111409'; // 03000000000 in international format

  function buildWhatsAppMessage(){
    const svc = document.getElementById('serviceType').value || '—';
    const acType = document.getElementById('acType').value || '—';
    const acBrand = document.getElementById('acBrand').value || '—';
    const units = qtyInput.value;
    const date = document.getElementById('prefDate').value || '—';
    const time = document.getElementById('prefTime').value || '—';
    const name = document.getElementById('fullName').value || '—';
    const phone = document.getElementById('phone').value || '—';
    const email = document.getElementById('email').value || '—';
    const address = document.getElementById('address').value || '—';
    const payment = document.querySelector('input[name=payment]:checked').value;
    const total = document.getElementById('sumTotal').textContent || '—';

    return [
      '*New AirCare Booking*',
      '',
      `*Service:* ${svc}`,
      `*AC Type:* ${acType}`,
      `*AC Brand:* ${acBrand}`,
      `*Units:* ${units}`,
      `*Preferred Date & Time:* ${date} ${time}`,
      '',
      `*Name:* ${name}`,
      `*Phone:* ${phone}`,
      `*Email:* ${email}`,
      `*Location:* ${address}`,
      '',
      `*Payment Method:* ${payment}`,
      `*Estimated Total:* ${total}`
    ].join('\n');
  }

  /* Submit */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = buildWhatsAppMessage();
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener');
    window.showToast("Booking confirmed! Opening WhatsApp to send your details to AirCare.");
    setTimeout(() => {
      form.reset();
      preview.innerHTML = '';
      mapSelectedInfo.style.display = 'none';
      discount = 0;
      goToStep(1);
      updateSummary();
    }, 1500);
  });
})();
