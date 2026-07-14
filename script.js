/* =====================================================================
   بلدية النخيل — main app
   - i18n (AR / EN) with persistent preference
   - Hash-based routing for public / user / admin views
   - Interactive dashboards, tables, forms, charts, modals
   ===================================================================== */

(() => {
  'use strict';

  /* =========================================================
     I18N CORE
     ========================================================= */
  const SUPPORTED = ['ar', 'en'];
  const stored = localStorage.getItem('nakheel-lang');
  let lang = SUPPORTED.includes(stored) ? stored : 'ar';
  let dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir  = dir;

  const t = (key) => (I18N[lang][key] !== undefined ? I18N[lang][key] : key);
  const tr = (obj) => obj[lang] || obj.ar || obj;
  const trArr = (arr) => arr.map(o => o[lang] || o.ar || o);
  const data = () => SITE[lang];
  const cur = (arabic, english) => lang === 'ar' ? arabic : english;

  const setLanguage = (newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    lang = newLang;
    dir  = newLang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('nakheel-lang', newLang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = dir;
    applyAll();
  };

  /* =========================================================
     TOAST
     ========================================================= */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2800);
  };

  /* =========================================================
     APPLY LANGUAGE — update all data-i18n nodes
     ========================================================= */
  const applyAll = () => {
    // 1) update every element with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });

    // 2) re-render dynamic sections
    renderQuick();
    renderServices();
    renderNews();
    renderContactTypes();
    renderActiveRoute();

    // 3) update counters + date + meta
    updateCounters();
    updateHijriDate();

    // 4) update lang toggle UI
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.langBtn === lang);
    });
  };

  /* =========================================================
     PUBLIC NAV / MOBILE MENU
     ========================================================= */
  const navbar = document.querySelector('.navbar');
  const burger = document.getElementById('burger');
  const navSheet = document.getElementById('navSheet');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = navbar.classList.toggle('is-open');
      navSheet.hidden = !open;
    });
    navSheet.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navbar.classList.remove('is-open');
      navSheet.hidden = true;
    }));
  }

  /* =========================================================
     LANGUAGE TOGGLE
     ========================================================= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang-btn]');
    if (!btn) return;
    e.preventDefault();
    setLanguage(btn.dataset.langBtn);
  });

  /* =========================================================
     HASH ROUTING
     ========================================================= */
  const views = {
    public: document.getElementById('view-public'),
    user:   document.getElementById('view-user'),
    admin:  document.getElementById('view-admin'),
  };
  let userRoute = 'user/overview';
  let adminRoute = 'admin/overview';
  let userFilter = 'all';
  let adminFilter = 'all';

  const showView = (name) => {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
    window.scrollTo(0, 0);
  };

  const renderActiveRoute = () => {
    const hash = location.hash.slice(1) || 'home';
    const parts = hash.split('/');
    const root = parts[0];

    if (root === 'user') {
      userRoute = hash || 'user/overview';
      showView('user');
      renderUser();
    } else if (root === 'admin') {
      adminRoute = hash || 'admin/overview';
      showView('admin');
      renderAdmin();
    } else {
      showView('public');
      // nav active
      document.querySelectorAll('.navbar__nav a').forEach(a => {
        a.classList.toggle('is-active', '#' + hash === a.getAttribute('href'));
      });
    }
  };

  window.addEventListener('hashchange', renderActiveRoute);

  /* =========================================================
     QUICK SERVICES
     ========================================================= */
  const renderQuick = () => {
    const grid = document.getElementById('quickgrid');
    if (!grid) return;
    grid.innerHTML = data().quickServices.map(q => `
      <a class="quick" href="#user/services" data-go="svc-${q.cat}">
        <div class="quick__icon" style="background:${q.color};color:${q.tint}">${q.icon}</div>
        <h3>${q.title}</h3>
        <p>${q.desc}</p>
        <span class="quick__arrow">${cur('← ابدأ', 'Start →')}</span>
      </a>
    `).join('');
  };

  /* =========================================================
     SERVICES + FILTERS
     ========================================================= */
  let activeFilter = 'all';
  const renderServices = () => {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    const items = data().services.filter(s => activeFilter === 'all' || s.cat === activeFilter);
    grid.innerHTML = items.map(s => `
      <article class="svc" data-go="svc-${s.id}">
        <div class="svc__head">
          <div class="svc__icon" style="background:${s.color};color:${s.tint}">${s.icon}</div>
          <h3 class="svc__title">${s.title}</h3>
        </div>
        <p class="svc__desc">${s.desc}</p>
        <div class="svc__foot">
          <span>${t('srvLede') ? cur('مدة التنفيذ', 'SLA') : ''} · ${s.sla}</span>
          <span class="svc__price">${s.price === 0 ? cur('مجانًا', 'Free') : s.price + ' ' + cur('ر.س', 'SAR')}</span>
        </div>
      </article>
    `).join('');
    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">${t('noItems')}</div>`;
    }
  };

  document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      renderServices();
    });
  });

  /* =========================================================
     NEWS
     ========================================================= */
  const renderNews = () => {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;
    grid.innerHTML = data().news.map(n => `
      <article class="news__item ${n.hero ? 'news__item--hero' : ''}">
        <div class="news__img"><img loading="lazy" src="${n.img}" alt="" /></div>
        <div class="news__body">
          <div class="news__date">${n.cat} · ${n.date}</div>
          <h3 class="news__title">${n.title}</h3>
          ${n.excerpt ? `<p class="news__excerpt">${n.excerpt}</p>` : ''}
        </div>
      </article>
    `).join('');
  };

  /* =========================================================
     CONTACT FORM TYPES
     ========================================================= */
  const renderContactTypes = () => {
    const sel = document.querySelector('#contactForm select');
    if (!sel) return;
    sel.innerHTML = `<option value="">${t('fieldPick')}</option>
      <option>${t('typeInquiry')}</option>
      <option>${t('typeComplaint')}</option>
      <option>${t('typeSuggest')}</option>
      <option>${t('typeRequest')}</option>`;
  };

  /* =========================================================
     COUNTERS (animated)
     ========================================================= */
  const updateCounters = () => {
    document.querySelectorAll('.counter strong[data-target]').forEach(el => {
      const target = Number(el.dataset.target);
      el.textContent = target.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
    });
  };

  /* =========================================================
     HIJRI DATE
     ========================================================= */
  const updateHijriDate = () => {
    const el = document.getElementById('hijriDate');
    if (!el) return;
    const now = new Date();
    try {
      const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      el.textContent = fmt.format(now) + (lang === 'ar' ? ' هـ' : ' AH');
    } catch (e) {
      el.textContent = lang === 'ar' ? 'السبت ١٩ محرم ١٤٤٧هـ' : 'Sat 19 Muharram 1447 AH';
    }
  };

  /* =========================================================
     CONTACT FORM
     ========================================================= */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button');
      const txt = contactForm.querySelector('#cfText');
      txt.textContent = t('sentBtn');
      btn.style.background = 'var(--success)';
      setTimeout(() => { txt.textContent = t('sendBtn'); btn.style.background = ''; contactForm.reset(); }, 3000);
      toast(t('toastSent'));
    });
  }

  /* =========================================================
     COUNT-UP ON SCROLL
     ========================================================= */
  const countersSection = document.querySelector('.counters');
  if (countersSection && 'IntersectionObserver' in window) {
    const animate = (el) => {
      const target = Number(el.dataset.target);
      const dur = 1500; const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = Math.round(target * eased);
        el.textContent = v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
      };
      requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.querySelectorAll('strong[data-target]').forEach(animate);
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(countersSection);
  }

  /* =========================================================
     USER PORTAL
     ========================================================= */
  const userPageTitle = document.getElementById('userPageTitle');
  const userPageSub   = document.getElementById('userPageSub');
  const userMain      = document.getElementById('userMain');
  const userLogoutBtn = document.getElementById('userLogoutBtn');

  const USER_AUTH_KEY = 'nakheel-user-auth';
  const USER_NAME_KEY = 'nakheel-user-name';
  const USER_DEMO_CREDENTIALS = { username: 'abdulrahman', password: '123456' };

  const isUserAuthenticated = () => localStorage.getItem(USER_AUTH_KEY) === 'true';
  const setUserAuthenticated = (name) => {
    localStorage.setItem(USER_AUTH_KEY, 'true');
    localStorage.setItem(USER_NAME_KEY, name);
  };
  const clearUserAuthentication = () => {
    localStorage.removeItem(USER_AUTH_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  };
  const updateUserIdentity = () => {
    const name = localStorage.getItem(USER_NAME_KEY) || 'عبد الرحمن العتيبي';
    const chipName = document.querySelector('#view-user .userchip__meta strong');
    if (chipName) chipName.textContent = name;
  };

  const setUserActiveNav = (route) => {
    document.querySelectorAll('[data-sidebar="user"] a').forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === route);
    });
  };

  const statusPill = (s) => `<span class="status status--${s}">${STATUS_LABEL[lang][s] || s}</span>`;
  const priorityPill = (p) => `<span class="tag tag--${p === 'high' ? 'danger' : p === 'low' ? 'success' : 'warn'}">${PRIORITY_LABEL[lang][p] || p}</span>`;

  const renderUserLoginPage = () => {
    userMain.innerHTML = `
      <section class="portal-login">
        <div class="portal-login__card">
          <span class="badge badge--gold">بوابة المستخدم</span>
          <h3>سجل الدخول إلى حسابك</h3>
          <p>استخدم اسم المستخدم وكلمة المرور للوصول إلى خدماتك الإلكترونية.</p>
          <form id="portalLoginForm" class="portal-login__form">
            <label class="form-field">
              <span>اسم المستخدم</span>
              <input id="portalUsername" name="username" type="text" autocomplete="username" placeholder="مثال: abdulrahman" required />
            </label>
            <label class="form-field">
              <span>كلمة المرور</span>
              <input id="portalPassword" name="password" type="password" autocomplete="current-password" placeholder="أدخل كلمة المرور" required />
            </label>
            <div id="portalLoginError" class="portal-login__alert" role="alert"></div>
            <button type="submit" class="btn btn--primary btn--block">تسجيل الدخول</button>
          </form>
          <p class="portal-login__hint">الحساب التجريبي: اسم المستخدم <strong>${USER_DEMO_CREDENTIALS.username}</strong> وكلمة المرور <strong>${USER_DEMO_CREDENTIALS.password}</strong></p>
        </div>
      </section>
    `;

    requestAnimationFrame(() => {
      const form = document.getElementById('portalLoginForm');
      const errorBox = document.getElementById('portalLoginError');
      if (!form || !errorBox) return;

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('portalUsername').value.trim();
        const password = document.getElementById('portalPassword').value;

        if (username.toLowerCase() === USER_DEMO_CREDENTIALS.username && password === USER_DEMO_CREDENTIALS.password) {
          setUserAuthenticated(username || USER_DEMO_CREDENTIALS.username);
          updateUserIdentity();
          toast(cur('تم تسجيل الدخول بنجاح', 'Signed in successfully'));
          window.location.hash = '#user/overview';
          return;
        }

        errorBox.textContent = cur('اسم المستخدم أو كلمة المرور غير صحيحة', 'The username or password is incorrect.');
        errorBox.classList.add('is-visible');
      });
    });
  };

  const renderUser = () => {
    updateUserIdentity();

    if (!isUserAuthenticated()) {
      userPageTitle.textContent = cur('تسجيل الدخول', 'Sign in');
      userPageSub.textContent = cur('أدخل بياناتك للوصول إلى خدماتك', 'Enter your details to access your services');
      renderUserLoginPage();
      return;
    }

    setUserActiveNav(userRoute);
    const [_, page] = userRoute.split('/');
    const pages = {
      overview:  () => userOverviewPage(),
      services:  () => userServicesPage(),
      requests:  () => userRequestsPage(),
      bills:     () => userBillsPage(),
      complaints:() => userComplaintsPage(),
      notifications:() => userNotificationsPage(),
      profile:   () => userProfilePage(),
    };
    userPageTitle.textContent = ({
      overview: t('userOverview'),
      services: t('userNewRequest'),
      requests: t('userMyRequests'),
      bills: t('userBills'),
      complaints: t('userComplaints'),
      notifications: t('userNotifications'),
      profile: t('userProfile'),
    })[page] || t('userOverview');
    userPageSub.textContent = ({
      overview: t('userPageSub'),
      services: t('nrSub'),
      requests: t('rqSub'),
      bills: t('blSub'),
      complaints: t('cpSub'),
      notifications: t('ntSub'),
      profile: t('prSub'),
    })[page] || '';
    (pages[page] || pages.overview)();
  };

  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', () => {
      clearUserAuthentication();
      updateUserIdentity();
      toast(cur('تم تسجيل الخروج', 'Signed out'));
      window.location.hash = '#user';
    });
  }

  /* -- overview -- */
  const userOverviewPage = () => {
    const reqs = data().userRequests.slice(0, 3);
    const bills = data().bills.filter(b => b.status === 'pending').slice(0, 2);
    const news = data().news.slice(0, 2);
    userMain.innerHTML = `
      <div class="cards">
        <div class="card">
          <div class="card__head"><span class="card__label">${t('uoOpenL')}</span><div class="card__icon" style="background:#fcf0d8;color:#c98014">⏳</div></div>
          <div class="card__value">${t('uoOpenV')}</div>
          <div class="card__trend trend--up">+1 ${cur('هذا الأسبوع', 'this week')}</div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__label">${t('uoDoneL')}</span><div class="card__icon" style="background:#e6f5ee;color:#2f9c6f">✓</div></div>
          <div class="card__value">${t('uoDoneV')}</div>
          <div class="card__trend trend--up">+2 ${cur('هذا الشهر', 'this month')}</div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__label">${t('uoBillsL')}</span><div class="card__icon" style="background:#fbeae8;color:#c0413a">💳</div></div>
          <div class="card__value">${t('uoBillsV')}</div>
          <div class="card__trend">${cur('مستحقة قريبًا', 'Due soon')}</div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__label">${t('uoNotifL')}</span><div class="card__icon" style="background:#eaf4f8;color:#1e6b85">🔔</div></div>
          <div class="card__value">${t('uoNotifV')}</div>
          <div class="card__trend">${cur('اطلع عليها', 'Check now')}</div>
        </div>
      </div>

      <div class="grid2">
        <div>
          <div class="panel">
            <div class="panel__head">
              <div><h3 class="panel__title">${t('uoQuick')}</h3><p class="panel__sub">${cur('روابط مباشرة للخدمات الأكثر استخدامًا', 'Direct links to most-used services')}</p></div>
            </div>
            <div class="panel__body">
              <div class="quickgrid" style="grid-template-columns:repeat(4,1fr)">
                <a class="quick" href="#user/services"><div class="quick__icon" style="background:#e8f3f0;color:#0e6b53">＋</div><h3>${t('uaNew')}</h3></a>
                <a class="quick" href="#user/requests"><div class="quick__icon" style="background:#fdf5e3;color:#a07a0c">🔍</div><h3>${t('uaTrack')}</h3></a>
                <a class="quick" href="#user/bills"><div class="quick__icon" style="background:#f0eaf6;color:#5e3b8a">💳</div><h3>${t('uaPay')}</h3></a>
                <a class="quick" href="#user/complaints"><div class="quick__icon" style="background:#fbeae8;color:#c0413a">💬</div><h3>${t('uaComplaint')}</h3></a>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head">
              <div><h3 class="panel__title">${t('uoRecent')}</h3></div>
              <a class="link" href="#user/requests">${t('viewAll')} ←</a>
            </div>
            <div class="panel__body panel__body--flush">
              <div class="tablewrap">
                <table class="table">
                  <thead><tr><th>${t('colId')}</th><th>${t('colType')}</th><th>${t('colDate')}</th><th>${t('colStatus')}</th></tr></thead>
                  <tbody>
                    ${reqs.map(r => `<tr>
                      <td><span class="table__id">${r.id}</span></td>
                      <td>${r.type}</td>
                      <td>${r.date}</td>
                      <td>${statusPill(r.status)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="panel">
            <div class="panel__head">
              <div><h3 class="panel__title">${t('uoBills')}</h3></div>
              <a class="link" href="#user/bills">${t('viewAll')} ←</a>
            </div>
            <div class="panel__body">
              <div class="list">
                ${bills.map(b => `<div class="li">
                  <div class="li__icon" style="background:#fbeae8;color:#c0413a">💳</div>
                  <div class="li__body"><strong>${b.type}</strong><span>${t('blDue')}: ${b.due}</span></div>
                  <div class="li__meta"><strong>${b.amount} ${cur('ر.س', 'SAR')}</strong><br/><button class="btn btn--primary" style="padding:6px 12px;font-size:12px;margin-top:4px" data-pay="${b.id}">${t('payNow')}</button></div>
                </div>`).join('') || `<div style="text-align:center;color:var(--muted);padding:20px">${t('noItems')}</div>`}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head"><h3 class="panel__title">${t('uoNews')}</h3></div>
            <div class="panel__body">
              <div class="list">
                ${news.map(n => `<div class="li">
                  <div class="li__icon" style="background:#eaf4f8;color:#1e6b85">📰</div>
                  <div class="li__body"><strong>${n.title}</strong><span>${n.date}</span></div>
                </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  /* -- new request -- */
  const userServicesPage = () => {
    const cats = [...new Set(data().services.map(s => s.cat))];
    userMain.innerHTML = `
      <div class="grid2">
        <div>
          <div class="panel">
            <div class="panel__head">
              <div><h3 class="panel__title">${t('nrPick')}</h3><p class="panel__sub">${cur('اختر الخدمة المناسبة لطلبك', 'Pick the right service for your request')}</p></div>
            </div>
            <div class="panel__body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${data().services.map(s => `<div class="svc" style="padding:18px" data-svc-pick="${s.id}">
                <div class="svc__head">
                  <div class="svc__icon" style="background:${s.color};color:${s.tint}">${s.icon}</div>
                  <h3 class="svc__title">${s.title}</h3>
                </div>
                <p class="svc__desc">${s.desc}</p>
                <div class="svc__foot">
                  <span>${s.sla}</span>
                  <span class="svc__price">${s.price === 0 ? cur('مجانًا', 'Free') : s.price + ' ' + cur('ر.س', 'SAR')}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>
        <div>
          <form class="panel" id="newReqForm" novalidate>
            <div class="panel__head">
              <div><h3 class="panel__title">${t('nrDetails')}</h3><p class="panel__sub">${cur('املأ التفاصيل وأرسل الطلب', 'Fill the details and submit')}</p></div>
            </div>
            <div class="panel__body" style="display:flex;flex-direction:column;gap:14px">
              <label class="field"><span>${t('nrPick')}</span>
                <select required>
                  <option value="">${cur('اختر من القائمة', 'Pick from the list')}</option>
                  ${data().services.map(s => `<option value="${s.id}">${s.title} — ${s.price === 0 ? cur('مجانًا', 'Free') : s.price + ' ' + cur('ر.س', 'SAR')}</option>`).join('')}
                </select>
              </label>
              <label class="field"><span>${t('nrDesc')}</span><textarea rows="4" placeholder="${t('phDesc')}" required></textarea></label>
              <label class="field"><span>${t('nrAttach')}</span><div class="dropzone">${t('nrUpload')}</div></label>
              <div style="display:flex;gap:8px">
                <button class="btn btn--primary" type="submit" style="flex:1"><span id="nrText">${t('nrSubmit')}</span></button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
    userMain.querySelectorAll('[data-svc-pick]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.svcPick;
        const sel = userMain.querySelector('#newReqForm select');
        if (sel) {
          sel.value = id;
          sel.focus();
          card.style.borderColor = 'var(--primary)';
          setTimeout(() => card.style.borderColor = '', 1200);
        }
      });
    });

    const form = document.getElementById('newReqForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const txt = form.querySelector('#nrText');
        txt.textContent = t('nrSent');
        form.querySelector('button').style.background = 'var(--success)';
        setTimeout(() => { txt.textContent = t('nrSubmit'); form.querySelector('button').style.background = ''; form.reset(); }, 3000);
        toast(t('toastSubmitted'));
      });
    }
  };

  /* -- requests list -- */
  const userRequestsPage = () => {
    const list = userFilter === 'all'
      ? data().userRequests
      : data().userRequests.filter(r => userFilter === 'open' ? (r.status === 'pending' || r.status === 'progress') : r.status === userFilter);
    userMain.innerHTML = `
      <div class="panel">
        <div class="panel__head" style="gap:12px">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="filter ${userFilter === 'all' ? 'is-active' : ''}" data-uf="all">${t('tabAll')}</button>
            <button class="filter ${userFilter === 'open' ? 'is-active' : ''}" data-uf="open">${t('tabOpen')}</button>
            <button class="filter ${userFilter === 'done' ? 'is-active' : ''}" data-uf="done">${t('tabDone')}</button>
            <button class="filter ${userFilter === 'rejected' ? 'is-active' : ''}" data-uf="rejected">${t('tabRejected')}</button>
          </div>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr>
                <th>${t('colId')}</th><th>${t('colType')}</th><th>${t('colDate')}</th>
                <th>${t('colStatus')}</th><th>${t('colCost')}</th><th>${t('colActions')}</th>
              </tr></thead>
              <tbody>
                ${list.map(r => `<tr>
                  <td><span class="table__id">${r.id}</span></td>
                  <td>${r.type}</td>
                  <td>${r.date}</td>
                  <td>${statusPill(r.status)}</td>
                  <td>${r.cost} ${cur('ر.س', 'SAR')}</td>
                  <td><div class="table__actions">
                    <button title="${t('rowView')}" data-view="${r.id}">👁</button>
                    <button title="${t('rowTrack')}" data-track="${r.id}">📍</button>
                    ${r.status === 'done' ? `<button title="${t('rowPay')}" data-pay="${r.id}">💳</button>` : ''}
                  </div></td>
                </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">${t('noItems')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    userMain.querySelectorAll('[data-uf]').forEach(b => b.addEventListener('click', () => {
      userFilter = b.dataset.uf; userRequestsPage();
    }));
    userMain.querySelectorAll('[data-track]').forEach(b => b.addEventListener('click', () => openRequestModal(b.dataset.track)));
    userMain.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openRequestModal(b.dataset.view)));
    userMain.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => toast(t('toastPaid'))));
  };

  /* -- bills -- */
  const userBillsPage = () => {
    const pending = data().bills.filter(b => b.status === 'pending');
    const paid = data().bills.filter(b => b.status === 'paid');
    const sum = (arr) => arr.reduce((s, b) => s + b.amount, 0);
    const billRow = (b) => `<tr>
      <td><span class="table__id">${b.id}</span></td>
      <td>${b.type}</td>
      <td>${b.due}</td>
      <td><strong>${b.amount} ${cur('ر.س', 'SAR')}</strong></td>
      <td>${b.status === 'pending' ? `<span class="tag tag--warn">${t('blPending')}</span>` : `<span class="tag tag--success">${t('blPaid')}</span>`}</td>
      <td>${b.status === 'pending' ? `<button class="btn btn--primary" data-pay="${b.id}" style="padding:6px 14px;font-size:12.5px">${t('payNow')}</button>` : '—'}</td>
    </tr>`;
    userMain.innerHTML = `
      <div class="cards">
        <div class="card"><div class="card__head"><span class="card__label">${t('blPending')}</span><div class="card__icon" style="background:#fbeae8;color:#c0413a">⏳</div></div><div class="card__value">${sum(pending)} ${cur('ر.س', 'SAR')}</div><div class="card__trend">${pending.length} ${cur('فاتورة', 'bills')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('blPaid')}</span><div class="card__icon" style="background:#e6f5ee;color:#2f9c6f">✓</div></div><div class="card__value">${sum(paid)} ${cur('ر.س', 'SAR')}</div><div class="card__trend">${paid.length} ${cur('فاتورة', 'bills')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${cur('المجموع', 'Total')}</span><div class="card__icon" style="background:#eaf4f8;color:#1e6b85">💰</div></div><div class="card__value">${sum(data().bills)} ${cur('ر.س', 'SAR')}</div><div class="card__trend">${data().bills.length} ${cur('فاتورة', 'bills')}</div></div>
      </div>
      <div class="panel">
        <div class="panel__head"><h3 class="panel__title">${t('blTitle')}</h3></div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>${t('blInv')}</th><th>${t('colType')}</th><th>${t('blDue')}</th><th>${t('blAmount')}</th><th>${t('colStatus')}</th><th>${t('colActions')}</th></tr></thead>
              <tbody>${data().bills.map(billRow).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    userMain.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => toast(t('toastPaid'))));
  };

  /* -- complaints -- */
  const userComplaintsPage = () => {
    userMain.innerHTML = `
      <div class="grid2 grid2--equal">
        <div>
          <div class="panel">
            <div class="panel__head"><h3 class="panel__title">${t('cpTitle')}</h3><button class="btn btn--primary" data-new-cp>+ ${t('newComplaint')}</button></div>
            <div class="panel__body panel__body--flush">
              <div class="tablewrap">
                <table class="table">
                  <thead><tr><th>${t('cpSubject')}</th><th>${t('cpDate')}</th><th>${t('cpStatus')}</th></tr></thead>
                  <tbody>${data().complaints.map(c => `<tr>
                    <td>${c.subject}</td>
                    <td>${c.date}</td>
                    <td>${statusPill(c.status)}</td>
                  </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--muted)">${t('noItems')}</td></tr>`}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div>
          <form class="panel" id="newCpForm">
            <div class="panel__head"><h3 class="panel__title">${t('newComplaint')}</h3></div>
            <div class="panel__body" style="display:flex;flex-direction:column;gap:12px">
              <label class="field"><span>${cur('الحي', 'District')}</span><select required><option>${cur('حي النخيل', 'Al-Nakheel')}</option><option>${cur('حي الياسمين', 'Al-Yasmeen')}</option><option>${cur('حي الورود', 'Al-Wurood')}</option></select></label>
              <label class="field"><span>${t('cpSubject')}</span><input type="text" required placeholder="${cur('اكتب موضوع الشكوى...', 'Write the subject...')}"></label>
              <label class="field"><span>${t('fieldMsg')}</span><textarea rows="4" required placeholder="${cur('اشرح المشكلة بالتفصيل...', 'Describe the issue...')}"></textarea></label>
              <button class="btn btn--primary btn--block" type="submit"><span id="cpText">${cur('إرسال الشكوى', 'Send complaint')}</span></button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('newCpForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = document.getElementById('cpText');
      txt.textContent = t('toastSubmitted') + ' ✓';
      toast(t('toastSubmitted'));
      setTimeout(() => { txt.textContent = cur('إرسال الشكوى', 'Send complaint'); e.target.reset(); }, 3000);
    });
  };

  /* -- notifications -- */
  const userNotificationsPage = () => {
    userMain.innerHTML = `
      <div class="panel">
        <div class="panel__head">
          <div><h3 class="panel__title">${t('ntTitle')}</h3><p class="panel__sub">${data().notifications.filter(n => n.unread).length} ${cur('غير مقروءة', 'unread')}</p></div>
          <button class="btn btn--ghost" id="markRead">${t('markAllRead')}</button>
        </div>
        <div class="panel__body">
          <div class="list">
            ${data().notifications.map(n => `<div class="li" ${n.unread ? 'style="background:var(--primary-soft);border-radius:10px;padding:14px;margin:0 -8px"' : ''}>
              <div class="li__icon" style="background:${n.type === 'bill' ? '#fbeae8' : n.type === 'reply' ? '#e6f5ee' : '#eaf4f8'};color:${n.type === 'bill' ? '#c0413a' : n.type === 'reply' ? '#2f9c6f' : '#1e6b85'}">${n.type === 'bill' ? '💳' : n.type === 'reply' ? '💬' : n.type === 'news' ? '📰' : '📋'}</div>
              <div class="li__body"><strong>${n.text}</strong><span>${n.time}</span></div>
              ${n.unread ? '<span class="dot" style="background:var(--danger);width:8px;height:8px;border-radius:50%"></span>' : ''}
            </div>`).join('')}
          </div>
        </div>
      </div>
    `;
    document.getElementById('markRead').addEventListener('click', () => {
      data().notifications.forEach(n => n.unread = false);
      toast(t('toastUpdated'));
      userNotificationsPage();
    });
  };

  /* -- profile -- */
  const userProfilePage = () => {
    userMain.innerHTML = `
      <form class="panel" id="profileForm" novalidate>
        <div class="panel__head"><div><h3 class="panel__title">${t('prPersonal')}</h3></div></div>
        <div class="panel__body">
          <div class="formgrid">
            <label class="field"><span>${t('prName')}</span><input type="text" value="${cur('عبد الرحمن العتيبي', 'Abdulrahman Al-Otaibi')}" required></label>
            <label class="field"><span>${t('prId')}</span><input type="text" value="1098765432" readonly></label>
            <label class="field"><span>${t('prPhone')}</span><input type="tel" value="0501234567" required></label>
            <label class="field"><span>${t('prEmail')}</span><input type="email" value="abdulrahman@example.com" required></label>
          </div>
        </div>
        <div class="panel__head" style="border-top:1px solid var(--line)"><div><h3 class="panel__title">${t('prAddress')}</h3></div></div>
        <div class="panel__body">
          <div class="formgrid">
            <label class="field"><span>${t('prDistrict')}</span><select><option>${cur('حي النخيل', 'Al-Nakheel')}</option><option>${cur('حي الياسمين', 'Al-Yasmeen')}</option></select></label>
            <label class="field"><span>${t('prStreet')}</span><input type="text" value="${cur('شارع الأمير سلطان', 'Prince Sultan St.')}"></label>
            <label class="field"><span>${t('prBuilding')}</span><input type="text" value="2456"></label>
          </div>
          <div style="margin-top:18px"><button class="btn btn--primary" type="submit"><span id="prText">${t('prSave')}</span></button></div>
        </div>
      </form>
    `;
    document.getElementById('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = document.getElementById('prText');
      txt.textContent = t('prSaved');
      toast(t('toastSaved'));
      setTimeout(() => { txt.textContent = t('prSave'); }, 2500);
    });
  };

  /* -- modal: request detail with timeline -- */
  const openRequestModal = (id) => {
    const r = data().userRequests.find(x => x.id === id);
    if (!r) return;
    const steps = lang === 'ar'
      ? [
          { title: 'تم استلام الطلب', desc: 'تم تسجيل طلبك بنجاح وإحالته للقسم المختص', state: 'done', time: '١٢ محرم ١٤٤٧' },
          { title: 'قيد المراجعة الفنية', desc: 'يجري المراجع الهندسي فحص الطلب والمستندات', state: 'done', time: '١٣ محرم ١٤٤٧' },
          { title: 'قيد المعالجة', desc: 'تم بدء إجراءات إصدار الرخصة', state: 'active', time: '١٤ محرم ١٤٤٧' },
          { title: 'الاعتماد النهائي', desc: 'بانتظار توقيع مدير الإدارة', state: '', time: '—' },
          { title: 'تسليم الرخصة', desc: 'ستصلك إشعارًا عند الجاهزية', state: '', time: '—' },
        ]
      : [
          { title: 'Request received', desc: 'Your request was logged and routed to the right department', state: 'done', time: '12 Muharram 1447' },
          { title: 'Technical review', desc: 'Engineering reviewer is checking your request and documents', state: 'done', time: '13 Muharram 1447' },
          { title: 'In progress', desc: 'Permit issuance has started', state: 'active', time: '14 Muharram 1447' },
          { title: 'Final approval', desc: 'Awaiting the director signature', state: '', time: '—' },
          { title: 'Permit delivered', desc: 'You will be notified when ready', state: '', time: '—' },
        ];
    const modal = document.createElement('div');
    modal.className = 'modal is-open';
    modal.innerHTML = `
      <div class="modal__box">
        <div class="modal__head">
          <h3>${r.id} — ${r.type}</h3>
          <button class="modal__close" data-close>×</button>
        </div>
        <div class="modal__body">
          <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
            ${statusPill(r.status)}
            ${priorityPill(r.priority)}
            <span style="color:var(--muted);font-size:13px">${r.date} · ${r.cost} ${cur('ر.س', 'SAR')}</span>
          </div>
          <div class="progress" style="margin-bottom:24px"><div class="progress__bar" style="width:${r.progress}%"></div></div>
          <h4 style="margin:0 0 12px;font-size:15px">${cur('سجل المعالجة', 'Processing timeline')}</h4>
          <div class="timeline">
            ${steps.map(s => `<div class="tl ${s.state === 'done' ? 'tl--done' : s.state === 'active' ? 'tl--active' : ''}">
              <div class="tl__head"><strong>${s.title}</strong><span>${s.time}</span></div>
              <p>${s.desc}</p>
            </div>`).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.hasAttribute('data-close')) modal.remove(); });
  };

  /* =========================================================
     ADMIN PORTAL
     ========================================================= */
  const adminPageTitle = document.getElementById('adminPageTitle');
  const adminPageSub   = document.getElementById('adminPageSub');
  const adminMain      = document.getElementById('adminMain');

  const setAdminActiveNav = (route) => {
    document.querySelectorAll('[data-sidebar="admin"] a').forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === route);
    });
  };

  const renderAdmin = () => {
    setAdminActiveNav(adminRoute);
    const [_, page] = adminRoute.split('/');
    const pages = {
      overview: adminOverview,
      requests: adminRequestsPage,
      services: adminServicesPage,
      news:     adminNewsPage,
      complaints: adminComplaintsPage,
      users:    adminUsersPage,
      finance:  adminFinancePage,
      settings: adminSettingsPage,
    };
    adminPageTitle.textContent = ({
      overview: t('adminDash'),
      requests: t('adminRequests'),
      services: t('adminServices'),
      news: t('adminNews'),
      complaints: t('adminComplaints'),
      users: t('adminUsers'),
      finance: t('adminFinance'),
      settings: t('adminSettings'),
    })[page] || t('adminDash');
    adminPageSub.textContent = t('adminPageSub');
    (pages[page] || adminOverview)();
  };

  /* -- chart helpers (SVG) -- */
  const drawLineChart = (data, opts = {}) => {
    const w = 600, h = 240, pad = 40;
    const max = Math.max(...data.values) * 1.15;
    const min = 0;
    const stepX = (w - pad * 2) / (data.values.length - 1);
    const points = data.values.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
      return [x, y];
    });
    const linePath = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = linePath + ` L${(pad + (data.values.length - 1) * stepX).toFixed(1)},${(h - pad).toFixed(1)} L${pad},${(h - pad).toFixed(1)} Z`;
    const gradId = 'g' + Math.random().toString(36).slice(2, 8);
    return `
      <svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0e6b53" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#0e6b53" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0,1,2,3,4].map(i => {
          const y = pad + (i / 4) * (h - pad * 2);
          return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>`;
        }).join('')}
        <path d="${areaPath}" fill="url(#${gradId})"/>
        <path d="${linePath}" fill="none" stroke="#0e6b53" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" stroke="#0e6b53" stroke-width="2"/>`).join('')}
        ${data.labels.map((l, i) => `<text x="${pad + i * stepX}" y="${h - 12}" text-anchor="middle" font-size="11" fill="#6b7878" font-family="Cairo">${l}</text>`).join('')}
        ${points.map((p, i) => `<text x="${p[0]}" y="${p[1] - 10}" text-anchor="middle" font-size="10" fill="#0e6b53" font-weight="700" font-family="Cairo">${data.values[i]}</text>`).join('')}
      </svg>
    `;
  };

  const drawDonut = (segments) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = 80, cx = 110, cy = 110, w = 60;
    let cum = 0;
    const arcs = segments.map(s => {
      const start = (cum / total) * Math.PI * 2 - Math.PI / 2;
      cum += s.value;
      const end = (cum / total) * Math.PI * 2 - Math.PI / 2;
      const large = end - start > Math.PI ? 1 : 0;
      const x1 = cx + Math.cos(start) * r, y1 = cy + Math.sin(start) * r;
      const x2 = cx + Math.cos(end)   * r, y2 = cy + Math.sin(end)   * r;
      const x3 = cx + Math.cos(end)   * w, y3 = cy + Math.sin(end)   * w;
      const x4 = cx + Math.cos(start) * w, y4 = cy + Math.sin(start) * w;
      return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${w},${w} 0 ${large} 0 ${x4.toFixed(1)},${y4.toFixed(1)} Z" fill="${s.color}"/>`;
    }).join('');
    return `<svg viewBox="0 0 220 220" class="chart" style="height:auto;max-width:220px;margin:0 auto;display:block">
      ${arcs}
      <text x="110" y="105" text-anchor="middle" font-size="11" fill="#6b7878" font-family="Cairo">${cur('المجموع', 'Total')}</text>
      <text x="110" y="125" text-anchor="middle" font-size="22" font-weight="800" fill="#0e6b53" font-family="Tajawal">${total}</text>
    </svg>`;
  };

  /* -- admin overview -- */
  const adminOverview = () => {
    const d = data();
    adminMain.innerHTML = `
      <div class="cards">
        <div class="card"><div class="card__head"><span class="card__label">${t('aoPendingL')}</span><div class="card__icon" style="background:#fcf0d8;color:#c98014">⏳</div></div><div class="card__value">${t('aoPendingV')}</div><div class="card__trend trend--up">+3 ${cur('اليوم', 'today')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('aoProgressL')}</span><div class="card__icon" style="background:#eaf4f8;color:#1e6b85">🔄</div></div><div class="card__value">${t('aoProgressV')}</div><div class="card__trend trend--up">+8 ${cur('هذا الأسبوع', 'this week')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('aoDoneL')}</span><div class="card__icon" style="background:#e6f5ee;color:#2f9c6f">✓</div></div><div class="card__value">${t('aoDoneV')}</div><div class="card__trend trend--up">+15%</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('aoRevenueL')}</span><div class="card__icon" style="background:#fdf5e3;color:#a07a0c">💰</div></div><div class="card__value">${t('aoRevenueV')}</div><div class="card__trend trend--up">+18%</div></div>
      </div>

      <div class="grid2">
        <div>
          <div class="panel">
            <div class="panel__head"><div><h3 class="panel__title">${t('aoTrend')}</h3></div></div>
            <div class="panel__body">${drawLineChart(d.requestTrend)}</div>
          </div>
          <div class="panel">
            <div class="panel__head">
              <div><h3 class="panel__title">${t('aoRecent')}</h3><p class="panel__sub">${cur('آخر ٥ طلبات', 'Latest 5 requests')}</p></div>
              <a class="link" href="#admin/requests">${t('viewAll')} ←</a>
            </div>
            <div class="panel__body panel__body--flush">
              <div class="tablewrap">
                <table class="table">
                  <thead><tr><th>${t('colId')}</th><th>${t('colCitizen')}</th><th>${t('colType')}</th><th>${t('colStatus')}</th></tr></thead>
                  <tbody>${d.adminRequests.slice(0, 5).map(r => `<tr>
                    <td><span class="table__id">${r.id}</span></td>
                    <td><div class="table__user"><div class="av">${initials(r.user)}</div>${r.user}</div></td>
                    <td>${r.type}</td>
                    <td>${statusPill(r.status)}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel">
            <div class="panel__head"><h3 class="panel__title">${t('aoBreakdown')}</h3></div>
            <div class="panel__body">
              ${drawDonut([
                { label: t('sPend'), value: d.statusBreakdown.pending, color: '#c98014' },
                { label: t('sProg'), value: d.statusBreakdown.progress, color: '#1e6b85' },
                { label: t('sDone'), value: d.statusBreakdown.done, color: '#2f9c6f' },
                { label: t('sRej'), value: d.statusBreakdown.rejected, color: '#c0413a' },
              ])}
              <div class="list" style="margin-top:16px">
                <div class="li"><div class="li__icon" style="background:#fcf0d8;color:#c98014">⏳</div><div class="li__body"><strong>${t('sPend')}</strong></div><div class="li__meta"><strong>${d.statusBreakdown.pending}</strong></div></div>
                <div class="li"><div class="li__icon" style="background:#eaf4f8;color:#1e6b85">🔄</div><div class="li__body"><strong>${t('sProg')}</strong></div><div class="li__meta"><strong>${d.statusBreakdown.progress}</strong></div></div>
                <div class="li"><div class="li__icon" style="background:#e6f5ee;color:#2f9c6f">✓</div><div class="li__body"><strong>${t('sDone')}</strong></div><div class="li__meta"><strong>${d.statusBreakdown.done}</strong></div></div>
                <div class="li"><div class="li__icon" style="background:#fbeae8;color:#c0413a">✕</div><div class="li__body"><strong>${t('sRej')}</strong></div><div class="li__meta"><strong>${d.statusBreakdown.rejected}</strong></div></div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel__head"><h3 class="panel__title">${t('aoByDist')}</h3></div>
            <div class="panel__body">
              ${d.districtData.map(x => {
                const max = Math.max(...d.districtData.map(y => y.count));
                const pct = (x.count / max) * 100;
                return `<div style="margin-bottom:14px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px"><span>${x.name}</span><strong>${x.count}</strong></div>
                  <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const initials = (name) => {
    const parts = name.split(' ');
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  /* -- admin requests -- */
  const adminRequestsPage = () => {
    const list = adminFilter === 'all'
      ? data().adminRequests
      : data().adminRequests.filter(r => r.status === adminFilter);
    adminMain.innerHTML = `
      <div class="panel">
        <div class="panel__head" style="gap:12px;flex-wrap:wrap">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="filter ${adminFilter === 'all' ? 'is-active' : ''}" data-af="all">${t('tabAll')}</button>
            <button class="filter ${adminFilter === 'pending' ? 'is-active' : ''}" data-af="pending">${t('sPend')}</button>
            <button class="filter ${adminFilter === 'progress' ? 'is-active' : ''}" data-af="progress">${t('sProg')}</button>
            <button class="filter ${adminFilter === 'done' ? 'is-active' : ''}" data-af="done">${t('sDone')}</button>
            <button class="filter ${adminFilter === 'rejected' ? 'is-active' : ''}" data-af="rejected">${t('sRej')}</button>
          </div>
          <input type="search" placeholder="${t('search')}..." class="search" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;min-width:200px">
        </div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr>
                <th>${t('colId')}</th><th>${t('colCitizen')}</th><th>${t('colType')}</th>
                <th>${t('colDistrict')}</th><th>${t('colDate')}</th><th>${t('colPriority')}</th>
                <th>${t('colStatus')}</th><th>${t('colActions')}</th>
              </tr></thead>
              <tbody>${list.map(r => `<tr>
                <td><span class="table__id">${r.id}</span></td>
                <td><div class="table__user"><div class="av">${initials(r.user)}</div><div><strong>${r.user}</strong><br/><span style="color:var(--muted);font-size:11.5px" dir="ltr">${r.userId}</span></div></div></td>
                <td>${r.type}</td>
                <td>${r.district}</td>
                <td>${r.date}</td>
                <td>${priorityPill(r.priority)}</td>
                <td>${statusPill(r.status)}</td>
                <td><div class="table__actions">
                  <button title="${t('rowApprove')}" data-approve="${r.id}">✓</button>
                  <button class="danger" title="${t('rowReject')}" data-reject="${r.id}">✕</button>
                  <button title="${t('rowMore')}">⋯</button>
                </div></td>
              </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">${t('noItems')}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    adminMain.querySelectorAll('[data-af]').forEach(b => b.addEventListener('click', () => {
      adminFilter = b.dataset.af; adminRequestsPage();
    }));
    adminMain.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
      const r = data().adminRequests.find(x => x.id === b.dataset.approve);
      if (r) r.status = 'progress';
      toast(cur('تمت الموافقة على الطلب', 'Request approved'));
      adminRequestsPage();
    }));
    adminMain.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
      const r = data().adminRequests.find(x => x.id === b.dataset.reject);
      if (r) r.status = 'rejected';
      toast(cur('تم رفض الطلب', 'Request rejected'));
      adminRequestsPage();
    }));
  };

  /* -- admin services -- */
  const adminServicesPage = () => {
    adminMain.innerHTML = `
      <div class="panel">
        <div class="panel__head">
          <div><h3 class="panel__title">${t('adminServices')}</h3><p class="panel__sub">${data().adminServices.length} ${cur('خدمة', 'services')}</p></div>
          <button class="btn btn--primary" id="addSvc">+ ${t('addService')}</button>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>${t('asvColName')}</th><th>${t('asvColCat')}</th><th>${t('asvColFee')}</th><th>${t('asvColSla')}</th><th>${t('asvColUse')}</th><th>${t('asvColActive')}</th><th>${t('colActions')}</th></tr></thead>
              <tbody>${data().adminServices.map(s => `<tr>
                <td><strong>${s.name}</strong></td>
                <td><span class="tag">${CAT_LABEL[lang][s.cat]}</span></td>
                <td>${s.fee === 0 ? cur('مجانًا', 'Free') : s.fee + ' ' + cur('ر.س', 'SAR')}</td>
                <td>${s.sla} ${cur('يوم', 'days')}</td>
                <td>${s.count.toLocaleString()}</td>
                <td><button class="toggle ${s.active ? 'is-on' : ''}" data-toggle="${s.id}"><span class="toggle__knob"></span><span class="toggle__label">${s.active ? t('toggleOn') : t('toggleOff')}</span></button></td>
                <td><div class="table__actions">
                  <button title="${t('rowEdit')}" data-edit="${s.id}">✎</button>
                  <button class="danger" title="${t('rowDel')}" data-del="${s.id}">🗑</button>
                </div></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    // inject toggle styles if not yet
    if (!document.getElementById('toggleCss')) {
      const s = document.createElement('style');
      s.id = 'toggleCss';
      s.textContent = `.toggle{display:inline-flex;align-items:center;gap:8px;padding:4px 8px;border-radius:999px;background:var(--surface-2);font-size:12px;font-weight:600;color:var(--muted);transition:all .2s ease;cursor:pointer}.toggle__knob{width:28px;height:16px;border-radius:999px;background:var(--muted-2);position:relative;transition:all .2s ease}.toggle__knob::before{content:"";position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:all .2s ease}.toggle.is-on{background:var(--success-soft);color:var(--success)}.toggle.is-on .toggle__knob{background:var(--success)}.toggle.is-on .toggle__knob::before{right:auto;left:2px}`;
      document.head.appendChild(s);
    }
    adminMain.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
      const s = data().adminServices.find(x => x.id === b.dataset.toggle);
      if (s) { s.active = !s.active; toast(t('toastUpdated')); adminServicesPage(); }
    }));
    adminMain.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const idx = data().adminServices.findIndex(x => x.id === b.dataset.del);
      if (idx >= 0) { data().adminServices.splice(idx, 1); toast(t('toastUpdated')); adminServicesPage(); }
    }));
    adminMain.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => toast(t('toastUpdated'))));
    document.getElementById('addSvc').addEventListener('click', () => toast(t('toastAdded')));
  };

  /* -- admin news -- */
  const adminNewsPage = () => {
    adminMain.innerHTML = `
      <div class="panel">
        <div class="panel__head">
          <div><h3 class="panel__title">${t('anwTitle')}</h3><p class="panel__sub">${data().news.length} ${cur('منشور', 'articles')}</p></div>
          <button class="btn btn--primary" id="addNews">+ ${t('addNews')}</button>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>${t('nwColTitle')}</th><th>${t('nwColCat')}</th><th>${t('nwColDate')}</th><th>${t('nwColStatus')}</th><th>${t('colActions')}</th></tr></thead>
              <tbody>${data().news.map(n => `<tr>
                <td><div class="table__user"><img src="${n.img}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" alt=""><strong>${n.title}</strong></div></td>
                <td><span class="tag">${NEWS_CAT[lang][n.cat] || n.cat}</span></td>
                <td>${n.date}</td>
                <td><span class="tag tag--success">${t('pub')}</span></td>
                <td><div class="table__actions">
                  <button title="${t('rowEdit')}">✎</button>
                  <button class="danger" title="${t('rowDel')}">🗑</button>
                </div></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('addNews').addEventListener('click', () => toast(t('toastAdded')));
    adminMain.querySelectorAll('.danger').forEach(b => b.addEventListener('click', () => toast(t('toastUpdated'))));
  };

  /* -- admin complaints -- */
  const adminComplaintsPage = () => {
    adminMain.innerHTML = `
      <div class="panel">
        <div class="panel__head"><div><h3 class="panel__title">${t('acpTitle')}</h3><p class="panel__sub">${data().adminComplaints.length} ${cur('شكوى', 'complaints')}</p></div></div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>${t('colId')}</th><th>${t('colCitizen')}</th><th>${t('cpSubject')}</th><th>${t('colDistrict')}</th><th>${t('colDate')}</th><th>${t('colStatus')}</th><th>${t('colActions')}</th></tr></thead>
              <tbody>${data().adminComplaints.map(c => `<tr>
                <td><span class="table__id">${c.id}</span></td>
                <td><div class="table__user"><div class="av">${initials(c.user)}</div>${c.user}</div></td>
                <td>${c.subject}</td>
                <td>${c.district}</td>
                <td>${c.date}</td>
                <td>${statusPill(c.status)}</td>
                <td><div class="table__actions">
                  <button title="${t('rowView')}">👁</button>
                  <button title="${cur('رد', 'Reply')}">💬</button>
                </div></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  /* -- admin users -- */
  const adminUsersPage = () => {
    adminMain.innerHTML = `
      <div class="panel">
        <div class="panel__head">
          <div><h3 class="panel__title">${t('ausTitle')}</h3><p class="panel__sub">${data().adminUsers.length} ${cur('مستخدم', 'users')}</p></div>
          <button class="btn btn--primary" id="addUser">+ ${t('addUser')}</button>
        </div>
        <div class="panel__body panel__body--flush">
          <div class="tablewrap">
            <table class="table">
              <thead><tr><th>${t('colName')}</th><th>${t('colIdNo')}</th><th>${t('colPhone')}</th><th>${t('colDistrict')}</th><th>${t('colReq')}</th><th>${t('colJoined')}</th><th>${t('colActions')}</th></tr></thead>
              <tbody>${data().adminUsers.map(u => `<tr>
                <td><div class="table__user"><div class="av">${initials(u.name)}</div>${u.name}</div></td>
                <td dir="ltr">${u.id_no}</td>
                <td dir="ltr">${u.phone}</td>
                <td>${u.district}</td>
                <td>${u.requests}</td>
                <td>${u.joined}</td>
                <td><div class="table__actions">
                  <button title="${t('rowView')}">👁</button>
                  <button title="${t('rowEdit')}">✎</button>
                </div></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('addUser').addEventListener('click', () => toast(t('toastAdded')));
  };

  /* -- admin finance -- */
  const adminFinancePage = () => {
    const f = {
      this: 2050000, last: 1740000, pending: 1240000, year: 8100000,
      trend: lang === 'ar'
        ? { labels: ['رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة','محرّم','صفر','ربيع ١','ربيع ٢','جمادى ١','جمادى ٢'], values: [1200,1340,1480,1620,1490,1680,1820,1740,1890,1980,2010,2050] }
        : { labels: ['J','Sh','R','Shw','Dq','Dh','M','S','R1','R2','J1','J2'], values: [1200,1340,1480,1620,1490,1680,1820,1740,1890,1980,2010,2050] },
    };
    adminMain.innerHTML = `
      <div class="cards">
        <div class="card"><div class="card__head"><span class="card__label">${t('fnMonth')}</span><div class="card__icon" style="background:#e6f5ee;color:#2f9c6f">💰</div></div><div class="card__value">${(f.this/1000000).toFixed(2)}M</div><div class="card__trend trend--up">+18% ${cur('مقارنة بالشهر السابق', 'vs last month')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('fnLast')}</span><div class="card__icon" style="background:#eaf4f8;color:#1e6b85">📊</div></div><div class="card__value">${(f.last/1000000).toFixed(2)}M</div><div class="card__trend">${cur('الشهر الماضي', 'Last month')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('fnPending')}</span><div class="card__icon" style="background:#fcf0d8;color:#c98014">⏳</div></div><div class="card__value">${(f.pending/1000000).toFixed(2)}M</div><div class="card__trend">${cur('مستحقات', 'Outstanding')}</div></div>
        <div class="card"><div class="card__head"><span class="card__label">${t('fnYear')}</span><div class="card__icon" style="background:#fdf5e3;color:#a07a0c">📈</div></div><div class="card__value">${(f.year/1000000).toFixed(2)}M</div><div class="card__trend trend--up">+22%</div></div>
      </div>
      <div class="panel">
        <div class="panel__head"><h3 class="panel__title">${t('fnTrend')}</h3></div>
        <div class="panel__body">${drawLineChart(f.trend)}</div>
      </div>
    `;
  };

  /* -- admin settings -- */
  const adminSettingsPage = () => {
    adminMain.innerHTML = `
      <div class="grid2">
        <div>
          <form class="panel" id="astGen">
            <div class="panel__head"><h3 class="panel__title">${t('astGen')}</h3></div>
            <div class="panel__body" style="display:flex;flex-direction:column;gap:14px">
              <label class="field"><span>${t('astSiteName')}</span><input type="text" value="${data().brandName || t('brandName')}"></label>
              <label class="field"><span>${t('astEmail')}</span><input type="email" value="info@nakheel.gov.sa"></label>
              <label class="field"><span>${t('astLang')}</span>
                <select>
                  <option value="ar" ${lang === 'ar' ? 'selected' : ''}>العربية</option>
                  <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
                </select>
              </label>
              <button class="btn btn--primary" type="submit"><span id="astGText">${t('save')}</span></button>
            </div>
          </form>
        </div>
        <div>
          <form class="panel" id="astNotif">
            <div class="panel__head"><h3 class="panel__title">${t('astNotif')}</h3></div>
            <div class="panel__body" style="display:flex;flex-direction:column;gap:14px">
              <label class="check"><input type="checkbox" checked> <span>${t('astEmailNew')}</span></label>
              <label class="check"><input type="checkbox" checked> <span>${t('astEmailDone')}</span></label>
              <label class="check"><input type="checkbox"> <span>${t('astSmsDone')}</span></label>
              <button class="btn btn--primary" type="submit"><span id="astNText">${t('save')}</span></button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (!document.getElementById('checkCss')) {
      const s = document.createElement('style');
      s.id = 'checkCss';
      s.textContent = `.check{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surface-2);border-radius:10px;cursor:pointer;font-size:14px}.check input{width:18px;height:18px;accent-color:var(--primary)}`;
      document.head.appendChild(s);
    }
    document.getElementById('astGen').addEventListener('submit', e => {
      e.preventDefault(); const sel = e.target.querySelector('select');
      if (sel && sel.value !== lang) setLanguage(sel.value);
      else toast(t('toastSaved'));
      document.getElementById('astGText').textContent = t('prSaved');
      setTimeout(() => document.getElementById('astGText').textContent = t('save'), 2000);
    });
    document.getElementById('astNotif').addEventListener('submit', e => {
      e.preventDefault();
      document.getElementById('astNText').textContent = t('prSaved');
      toast(t('toastSaved'));
      setTimeout(() => document.getElementById('astNText').textContent = t('save'), 2000);
    });
  };

  /* =========================================================
     PAY BUTTONS (delegated)
     ========================================================= */
  document.addEventListener('click', (e) => {
    const pay = e.target.closest('[data-pay]');
    if (!pay) return;
    if (pay.classList.contains('li__meta')) return;
    // bill payment animation
    const id = pay.dataset.pay;
    const r = data().userRequests.find(x => x.id === id) || data().bills.find(x => x.id === id);
    if (r) toast(t('toastPaid'));
  });

  /* =========================================================
     PORTAL SIDEBAR TOGGLE
     ========================================================= */
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const sb = document.getElementById(id);
      if (sb) sb.classList.toggle('is-open');
    });
  });

  /* =========================================================
     KEYBOARD SHORTCUT: press L to toggle language
     ========================================================= */
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setLanguage(lang === 'ar' ? 'en' : 'ar');
    }
  });

  /* =========================================================
     INIT
     ========================================================= */
  // initial render
  if (!location.hash) location.hash = '#home';
  applyAll();

})();
