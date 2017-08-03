$(document).ready(function () {
    console.log('ready');
});

$(function() {

    //for tinyMCE
  tinymce.init({ 
    selector: '.tinymce'
  });

  $('.tjsbutton').click(function () {
    $('#togetherjs-dock').toggle();
  });

 $("#start-togetherjs").click(TogetherJS);
});