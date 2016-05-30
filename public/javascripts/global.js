/**
 * Created by igorgo on 27.05.2016.
 */
var prodCodesCache = {},o = {};
// $("input:radio[name='r']:checked").val() радио
function getProdCodes(t) {
    return new Promise(function (resolve, reject) {
        $.get("/data/prodcodes/" + t)
            .done(function (d) {
                if (t === "A") prodCodesCache.A = d;
                else if (t === "T") prodCodesCache.T = d;
                resolve();
                }
            )
            .fail(reject);
    });
}

function initPageObjects() {
    o.modalGood = $("#good-edit-dialog");
    o.formGood = $("#good-edit-form");
    o.formGood.prodType = o.formGood.find("input:radio[name='good-edit-type']");
    o.formGood.prodCode = o.formGood.find("#good-edit-code");
    o.formGood.name = o.formGood.find("#good-edit-name");
    o.formGood.volume = o.formGood.find("#good-edit-volume");
    o.formGood.ok = o.formGood.find("#good-edit-ok");
    o.formGood.cancel = o.formGood.find("#good-edit-cancel");
    o.formGood.error = o.formGood.find("#good-edit-error");
    o.formIncome = $("#income-form");
    o.btnAddGood = $(".add-good-button");
}

function initNavigation (){
    // jQuery to collapse the navbar on scroll
    function collapseNavbar() {
        if ($(".navbar").offset().top > 50) {
            $(".navbar-fixed-top").addClass("top-nav-collapse");
        } else {
            $(".navbar-fixed-top").removeClass("top-nav-collapse");
        }
    }

    $(window).scroll(collapseNavbar);
    $(document).ready(collapseNavbar);

// Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function() {
        if ($(this).attr('class') != 'dropdown-toggle active' && $(this).attr('class') != 'dropdown-toggle') {
            $('.navbar-toggle:visible').click();
        }
    });

    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });
}

function bindEvents() {
    initNavigation();
    o.formGood.prodCode.bind("resetValue", function (event) {
        var elc = $(this).data('combobox');
        elc.clearTarget();
        elc.triggerChange();
        elc.clearElement();
    });
    o.formGood.prodCode.bind("fillOptions", function (event) {
        var el= $(this);
        el.find("option").remove().end();
        el.append($("<option></option>"));
        el.trigger("resetValue");
        var vals;
        var prodType = el.data("prodType");
        if (prodType === "A") vals = prodCodesCache.A;
        else if (prodType === "T") vals = prodCodesCache.T;
        else vals = prodCodesCache.A.concat(prodCodesCache.T);
        $.each(vals, function (index, value) {
            //noinspection JSUnresolvedVariable
            el.append($("<option></option>")
                .attr("value", value.rowid)
                .text(value.code + " - " + value.name));
        });
        el.data('combobox').refresh();
    });
    o.formGood.prodType.bind("click", function () {
        var v = $(this).val();
        var e = o.formGood.prodCode;
        if (e.data("prodType") != v) e.data("prodType", v).trigger("fillOptions");
    });
    o.btnAddGood.bind("click", function () {
        o.modalGood.modal("show");
    });
    o.modalGood.bind("hidden.bs.modal", function () {
        o.formGood.validator('destroy');
        o.formGood.error.text("");
        o.formGood.prodCode.trigger("resetValue");
        o.formGood.name.val("");
        o.formGood.volume.val("0");
    });
    o.formGood.cancel.bind("click", function () {
        o.modalGood.modal('hide');
    });
    o.formGood.ok.bind("click", function () {
        o.formGood.error.text("");
        o.formGood.validator('destroy');
        o.formGood.validator({
            custom: {
                vgzerro: function ($el) {
                    if ($el.val()) return $el.val() > 0;
                    else return true;
                }
            },
            errors: {
                vgzerro: 'Число должно быть больше нуля'
            }
        });
        o.formGood.validator('validate');
        if (o.formGood.find(".has-error").length > 0) return false;
        var data = {
            code: o.formGood.prodCode.val(),
            name: o.formGood.name.val(),
            volume: o.formGood.volume.val()
        };
        $.ajax({
                type: 'PUT',
                data: data,
                url: '/data/goods',
                dataType: 'JSON'
        }).done(function (resp) {
            o.modalGood.modal('hide');
        }).fail(function(resp) {
            o.formGood.error.text(resp.responseText);
        });

    })
}

$(function() {
    initPageObjects();
    bindEvents();
    Promise.all( [getProdCodes("A"),getProdCodes("T")] )
        .then(function(){
            o.formGood.prodCode.combobox();
            o.formGood.prodType.filter(":checked").trigger("click");
        })
        .catch (console.error);
});


