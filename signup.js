// Email signup → Mailchimp audience.
// The site is static and Mailchimp's form endpoint doesn't allow CORS, so this
// uses its JSONP endpoint (post-json) instead of fetch.
(function () {
  // Mailchimp → Audience → Signup forms → Embedded form → the <form action="..."> URL
  var MAILCHIMP_URL = 'https://stoptherace.us19.list-manage.com/subscribe/post?u=0c24053c9eb5c67a0fe52dd43&id=6c3370e4dc&f_id=008ac2e1f0';
  // Audience → Settings → Audience fields and *|MERGE|* tags → tag of the zip code field
  var ZIP_TAG = 'MMERGE7';

  var form = document.getElementById('signup-form');
  var thanks = document.getElementById('signup-thanks');
  var error = document.getElementById('signup-error');
  var fields = form.elements;
  var button = form.querySelector('button');

  function done() {
    form.style.display = 'none';
    error.style.display = 'none';
    thanks.style.display = 'block';
  }

  function fail(msg) {
    button.disabled = false;
    error.textContent = msg || 'Something went wrong. Please try again.';
    error.style.display = 'block';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Honeypot: bots fill every field
    if (fields.website.value) return done();

    var name = fields.fullname.value.trim().split(/\s+/);
    var params = {
      EMAIL: fields.email.value.trim(),
      FNAME: name.shift(),
      LNAME: name.join(' ')
    };
    params[ZIP_TAG] = fields.zip.value.trim();

    var callback = 'mcSignup' + Date.now();
    var script = document.createElement('script');
    var timeout = setTimeout(function () { cleanup(); fail(); }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    window[callback] = function (res) {
      cleanup();
      if (res.result === 'success' || /already subscribed/i.test(res.msg)) return done();
      // Mailchimp prefixes field errors with "0 - " and sometimes includes HTML
      var tmp = document.createElement('div');
      tmp.innerHTML = res.msg || '';
      fail(tmp.textContent.replace(/^\d+ - /, ''));
    };

    button.disabled = true;
    error.style.display = 'none';
    script.src = MAILCHIMP_URL.replace('/post?', '/post-json?') + '&' +
      Object.keys(params).map(function (k) {
        return k + '=' + encodeURIComponent(params[k]);
      }).join('&') + '&c=' + callback;
    script.onerror = function () { cleanup(); fail(); };
    document.body.appendChild(script);
  });
})();
