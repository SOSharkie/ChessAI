
//For each of the main white first moves, return randomly between 2 good move options
var getFirstBlackMove = function(whiteMove){
	switch (whiteMove){
		case "e4": return (Math.random() < 0.5 ? "e6" : "c5");
		case "d4": return (Math.random() < 0.5 ? "e6" : "d5");
		case "Nf3": return (Math.random() < 0.5 ? "e6" : "d5");
		case "Nc3": return (Math.random() < 0.5 ? "e6" : "d5");
		case "c4": return (Math.random() < 0.5 ? "e5" : "Nf6");
		case "g3": return (Math.random() < 0.5 ? "e6" : "c5");
		case "f4": return (Math.random() < 0.5 ? "e5" : "Nf6");
		default: return (Math.random() < 0.5 ? "e5" : "d5");
	}
}

var getSecondBlackMove = function(moveHistory){
	if (moveHistory[0] === "e4" && moveHistory[1] === "c5"){
		if (moveHistory[2] === "Nf3"){
			return "Nc6";
		} else if (moveHistory[2] === "Nc3"){
			return "e6";
		} else if (moveHistory[2] === "c3"){
			return "Nf6";
		} else {
			return null;
		}
	} else if (moveHistory[0] === "e4" && moveHistory[1] === "e6"){
		if (moveHistory[2] === "c4"){
			return "Nf6";
		} else if (moveHistory[2] === "e4"){
			return "d5";
		} else if (moveHistory[2] === "Nf3"){
			return "c5";
		} else if (moveHistory[2] === "Nc3"){
			return "d5";
		} else {
			return null;
		}
	} else if (moveHistory[0] === "d4" && moveHistory[1] === "e6"){
		if (moveHistory[2] === "d4"){
			return "d5";
		} else if (moveHistory[2] === "d3"){
			return "d5";
		} else if (moveHistory[2] === "Nf3"){
			return "d5";
		} else {
			return null;
		}
	} else if (moveHistory[0] === "d4" && moveHistory[1] === "d5"){
		if (moveHistory[2] === "c4"){
			return "dxc4";
		} else if (moveHistory[2] === "Nf3"){
			return "Nf6";
		} else if (moveHistory[2] === "Bf4"){
			return "Nf6";
		} else {
			return null;
		}
	} else if (moveHistory[0] === "Nf3" && moveHistory[1] === "e6"){
		if (moveHistory[2] === "c4"){
			return "d5";
		} else if (moveHistory[2] === "d4"){
			return "c5";
		} else if (moveHistory[2] === "g3"){
			return "Nf6";
		} else {
			return null;
		}
	} else if (moveHistory[0] === "Nf3" && moveHistory[1] === "d5"){
		if (moveHistory[2] === "g3"){
			return "Nf6";
		} else if (moveHistory[2] === "d4"){
			return "Nf6";
		} else if (moveHistory[2] === "c4"){
			return "e6";
		} else {
			return null;
		}
	} else {
		return null;
	}
}