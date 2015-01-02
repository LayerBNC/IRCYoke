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
if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}
