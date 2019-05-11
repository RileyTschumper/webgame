var app;

function init(){
	app = new Vue({
		el: "#app",
		data: {
			new_user: false,
			info_text: "New User?",
			button_text: "Create an Account"
		}
	});
	console.log("app initalized");

	$('select').imagepicker();
}

function buttonClick(){
	if(app.new_user == false){
		app.new_user = true;
		app.info_text = "Existing User?";
		app.button_text = "Sign-in";
	}
	else{
		app.new_user = false;
		app.info_text = "New User?";
		app.button_text = "Create an Account";
	}
}
