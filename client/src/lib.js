function loadHbT(selector) {
    $.get( $(selector).attr('src') , function( data ) {
        $(selector).html(data);
    });
}
