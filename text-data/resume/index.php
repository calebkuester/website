<style>
body {
  margin:0 auto;
}
</style>
<script>
function loadPDF(divId){
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../../assets/pdf/CalebKuesterResume.pdf", true);
  xhr.responseType = "blob";
  xhr.mimetype="application/pdf";
  xhr.onload = function() {
    if (this.status === 200) {
      $("#"+divId).attr('src', window.URL.createObjectURL(this.response));
    }else{
      //borkd
    }
  };
  xhr.send();
}
</script>
<embed width="100%" height="100%" name="plugin" id="resume" type="application/pdf">
<!--IFRAME SHOWS "INTERPRETED AS DOCUMENT BUT TRANSFERRED WITH MIME TYPE APPLICATION/PDF" WARNING
<iframe id="resume" style="width:100%; height:100%;" type="application/pdf" frameborder=0></iframe>-->
<script>loadPDF("resume");</script>
