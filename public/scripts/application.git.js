$(function() {
  window.google.identitytoolkit.setConfig({
    developerKey: "AIzaSyCdQ1ogPMAZ8RHFWOUyutrYcuH_x7g4EPM",
    companyName: "Apriso",
    callbackUrl: "http://localhost:1337/verify",
    realm: "apriso",
    userStatusUrl: "http://localhost:1337/user_status",
    loginUrl: "http://localhost:1337/login",
    signupUrl: "http://localhost:1337/signup",
    homeUrl: "http://localhost:1337/",
    logoutUrl: "http://localhost:1337/logout",
    idps: ["Gmail", "Yahoo", "AOL", "Hotmail"],
    tryFederatedFirst: true,
    useCachedUserStatus: false,
    useContextParam: true
  });

  $("#navbar").accountChooser();
});