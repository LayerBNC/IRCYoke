function loadHbT(selector) {
    $.get( $(selector).attr('src') , function( data ) {
        $(selector).html(data);
    });
    return $(selector).promise();
}

function getHbT(selector) {
    var result;
    $.get( $(selector).attr('src') , function( data ) {
         result = data;
    });
    return result;
}
