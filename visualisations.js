// Container function for the visualisations.
function Visualisations(){
	// Array to store visualisations.
	this.visuals = [];
	// Currently selected vis. Set to null until vis loaded in.
	this.selectedVisual = null;

	// Add a new visualisation to the array.
	// @param vis: a visualisation object.
	this.add = function(vis){
		this.visuals.push(vis);
		// If selectedVisual is null set the new visual as the 
		// current visualiation.
		if(this.selectedVisual == null){
			this.selectVisual(vis.name);
		}
	};

	// Select a visualisation using it name property
	// @param visName: name property of the visualisation.
	this.selectVisual = function(visName){
		for(var i = 0; i < this.visuals.length; i++){
			if(visName == this.visuals[i].name){
				this.selectedVisual = this.visuals[i];
			}
		}
	};
}
