

var ispringPresentationConnector = {};
var playbackController;

var prevBtn = document.getElementById("prev");
var nextBtn = document.getElementById("next");
var nextStep = document.getElementById("step");
var lastStepBtn = document.getElementById("lStep");
var toStetpBtn = document.getElementById('toStep');

var slideIndexLabel = document.getElementById("pageIndex");

var slidesCount;
var isPlayedPresentation;
var thumbImg = document.getElementById("thumb");
var thumbImg2 = document.getElementById("thumb2");
var sevenSlide;
var threeStep;
var threeStepOffset;

ispringPresentationConnector.register = function (player) {
    var presentation = player.presentation();
    slidesCount = presentation.slides().count();
    sevenSlide = presentation.slides().getSlide(6);
    threeStep = sevenSlide.animationSteps().getStep(2);
    threeStepOffset = threeStep.duration();
    playbackController = player.view().playbackController();

   
    initPlaybackControllerEventsHandlers();
    initButtonsEventsHandlers();
};



function initPlaybackControllerEventsHandlers() {
    playbackController.slideChangeEvent().addHandler(function (slideIndex) {
        slideIndexLabel.innerHTML = "Slide: " + (slideIndex + 1) + " of " + slidesCount;
        thumbImg.setAttribute("src","8ed465a2b149cae41d1727a685452292/images/bImageSlide"+(slideIndex+1)+".jpg");
        thumbImg2.setAttribute("src","8ed465a2b149cae41d1727a685452292/images/bImageSlide"+(slideIndex+1)+".jpg");
    });


}

function initButtonsEventsHandlers() {
    prevBtn.onclick = function () {
        playbackController.gotoPreviousSlide();
       
    };

  

    nextBtn.onclick = function () {
        playbackController.gotoNextSlide();
     
    };
    nextStep.onclick = function () {
        playbackController.gotoNextStep();
     
    };

    lastStepBtn.onclick = function () {
        playbackController.gotoPreviousStep();
     
    };

    toStetpBtn.onclick=function(){
        playbackController.gotoTimestamp(6,3,threeStepOffset)
    };
   
}