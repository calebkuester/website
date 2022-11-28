<div id="background-wrapper">
  <div id="leftSideGreekColumn" class="greek-column"></div>
  <div id="rightSideGreekColumn" class="greek-column"></div>
  <div id="container">
    <div class="row">
      <div class="col-3 col-xl-2 left-column">
        <div id="social-modal">
          <!--Contact Sidebar -->
          <nav id="contactSidebar" class="cast-shadow modal-feature">
            <ul class="list-unstyled components">
              <p id="contactNavTitle" class="nav-title">Contact</p>
              <li>
                <a href="#contactPageSubmenu" data-toggle="collapse" aria-expanded="false" class="dropdown-toggle">Social Media</a>
                <ul class="collapse list-unstyled" id="contactPageSubmenu">
                  <li>
                    <a href="www.linkedin.com/in/caleb-kuester-79514136">Linkedin</a>
                  </li>
                  <li>
                    <a href="https://www.facebook.com/caleb.kuester">Facebook</a>
                  </li>
                  <li>
                    <a href="#">Twitter</a>
                  </li>
                  <li>
                    <a href="#">Instagram</a>
                  </li>
                  <li>
                    <a href="#">Snapchat</a>
                  </li>
                  <li>
                    <a href="#">Myspace</a>
                  </li>
                  <li>
                    <a href="#">Battletag</a>
                  </li>
                </ul>
              </li>
              <li>
                <a href="#contactPageSubmenu1" data-toggle="collapse" aria-expanded="false" class="dropdown-toggle">Traditional</a>
                <ul class="collapse list-unstyled" id="contactPageSubmenu1">
                  <li>
                    <a href="#">Email</a>
                  </li>
                  <li>
                    <a href="#">Smoke Signal</a>
                  </li>
                </ul>
              </li>
              <li>
                <a href="#contactPageSubmenu2" data-toggle="collapse" aria-expanded="false" class="dropdown-toggle">Misc</a>
                <ul class="collapse list-unstyled" id="contactPageSubmenu2">
                  <li>
                    <a href="http://www.calebkuester.com/pages/wall/">Post on This Site</a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div class="col-6 col-xl-8 middle-column">
        <div id="pictureSquare" class="center-content cast-shadow" onresize="addFeatureOptionIndicators()">
          <img id="lowResPicture" src=""/>
          <img id="loadedPicture" src=""/>
        </div>
        <div id="controlsSquare" class="center-content">
          <div id="control-panel" class="cast-shadow">
          </div>
        </div>
        <div id="infoSquare" class="center-content cast-shadow info-benign">
          <div id="infoContent">
            <div id="infoContentContainer"></div>
            <div id="info-0" class="swapper"></div>
            <div id="info-1" class="swapper hidden"></div>
            <div id="go-away-box" class="hidden" onclick="minimizeInfo()"></div>
            <!--<video autoplay muted loop id="backgroundVideo">
              <source src="assets/concert.mp4" type="video/mp4">
            </video>-->
          </div>
        </div>
      </div>
      <div class="col-3 col-xl-2 right-column">
        <div class = "modal-feature cast-shadow">
          <!--Features Sidebar -->
          <nav id="featuresSidebar">
            <ul id="featureDropdownList" class="list-unstyled components">
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </div>
</div>