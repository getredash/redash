var SignUp = new function() {
  var self = this,
      el = document.getElementById('signup'),
      emailEl = document.getElementById('email');

  emailEl.addEventListener('keypress', function(e) {
    if (e.keyCode == 13) {
      self.send();
    }
  });

  Object.defineProperty(this, 'status', {
    set: function (status) {
      el.dataset.status = status;
      Feedback.clear();
    }
  });

  this.openForm = function() {
      self.status = 'form';
      analytics.track('Clicked Early Access Signup', {
        text: 'Early Access Signup',
        location: 'get-started',
        CTA: 'Early Access Signup',
        category: 'Home Page',
        type: 'Button',
        pageTitle: document.title
      });
  };

  this.send = function() {
    // validate email
    if (!validateEmail(emailEl.value)) {
      // ouch
      Feedback.set({
        success: false,
        text: 'Oops.. your email isn\'t valid :/'
      });
      return;
    }

    // sending
    Feedback.set({text: 'Sending...'});

    $.ajax({
      url: "//formspree.io/arik@redash.io",
      method: "POST",
      data: {message: "Early access signup", email: emailEl.value},
      dataType: "json"
    }).done(function() {
      self.status = 'success';
    });
    analytics.track('Submited Email', {
      location: 'get-started',
      category: 'Home Page',
      type: 'Button'
    });
};

  function validateEmail(email) {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
  }

  var Feedback = new function() {
    var el = document.getElementById('feedback');

    this.set = function(data) {
      if (el.dataset.show) {
        el.dataset.show = false;
        setTimeout(function() {
          set(data);
        }, 200); // animation time
      } else {
        set(data);
      }
    };

    this.clear = function() {
      el.dataset.show = false;
    };

    function set(data) {
      el.innerHTML = data.text;
      el.dataset.success = data.success;
      el.dataset.show = true;
    }
  }
}
