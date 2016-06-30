(function ($) {
    'use strict';

    $.ajaxChimp = {
        init: function (selector, options) {
            $(selector).ajaxChimp(options);
        }
    };

    $.fn.ajaxChimp = function (options) {
        $(this).each(function(i, elem) {
            var form = $(elem);
            var email = form.find('input[type=email]');
            var label = form.find('label[for=' + email.attr('id') + ']');
            var button = form.find('button');

            var url = options.url.replace('/post?', '/post-json?').concat('&c=?');

            form.submit(function () {
                var msg;
                function successCallback(resp) {
                    button.html('Subscribe');
                    form.find('input').prop('disabled', false);
                    if (resp.result === 'success') {
                        msg = '<i class="fa fa-check"></i> Thank you. We have sent you a confirmation email.';
                        $(label).parent().removeClass('has-error');
                        $(label).parent().addClass('has-success');

                        form.find('.input-group').hide();
                        analytics.track('Signed up to Newsletter');
                    } else {
                        $(label).parent().addClass('has-error');
                        var index = -1;
                        try {
                            var parts = resp.msg.split(' - ', 2);
                            if (parts[1] === undefined) {
                                msg = resp.msg;
                            } else {
                                var i = parseInt(parts[0], 10);
                                if (i.toString() === parts[0]) {
                                    index = parts[0];
                                    msg = parts[1];
                                } else {
                                    index = -1;
                                    msg = resp.msg;
                                }
                            }
                        }
                        catch (e) {
                            index = -1;
                            msg = resp.msg;
                        }
                    }

                    label.html(msg);
                    label.show(2000);
                }

                var data = {};
                var dataArray = form.serializeArray();
                $.each(dataArray, function (index, item) {
                    data[item.name] = item.value;
                });

                $.ajax({
                    url: url,
                    data: data,
                    success: successCallback,
                    dataType: 'jsonp',
                    error: function (resp, text) {
                        console.log('MailChimp ajax submit error: ' + text);
                    }
                });

                form.find('input').prop('disabled', true);
                button.html('<i class="fa fa-spinner fa-spin"></i>');

                return false;
            });
        });
        return this;
    };
})(jQuery);
