//
// Non-wildcard version of smatch.
//
function smatch1(pattern, target) {
    if (typeof pattern === "number" || typeof pattern == "string")
        return pattern === target;          // same number or string
    else
        return pattern instanceof Array &&  // pattern and
               target instanceof Array &&   // target are arrays
               pattern.length === target.length &&    // of the same length
               pattern.every(function(elem, index) {  // and recursively
                   return smatch1(elem, target[index]); // contain same elems
               });
}

function smatch(pattern, target, table) {
    table = table || {};
    
    if(typeof pattern === "number") {
	return pattern === target ? table : null;
    }
    
    if(typeof pattern === "string") {
	if(pattern.endsWith("?")) {
	    var len = pattern.length;
	    table[pattern.substring(0, len-1)] = target;
	    return table;
	} else {
	    return pattern === target ? table : null;
	}
    }

    return pattern instanceof Array &&  // pattern and
            target instanceof Array &&   // target are arrays
            pattern.length === target.length &&    // of the same length
            pattern.every(function(elem, index) {  // and recursively
                   return smatch(elem, target[index], table); // contain same elems
            }) ? table : null;
}

var diffPowerRule = {
    pattern : function(target, table) {
        return smatch(['DERIV', ['^', 'E?', 'N?'], 'V?'], target, table) &&
            typeof table.N === "number";
    },
    transform: function(table) {
        return (['*', ['*', table.N, ['^', table.E, table.N - 1]], 
                ['DERIV', table.E, table.V]]);
    },
    label: "diffPowerRule"
};

//
//  d/dt t = 1
//
var diffXRule = {
    pattern : function(target, table) {
        return smatch(['DERIV', 'E?', 'V?'], target, table) &&
            table.E === table.V; //derive t wrt to t
    },
    transform: function(table) {
        return 1;
    },
    label: "diffXRule"
};

//
// (u + v)' = u' + v'
//
var diffSumRule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['DERIV', ['+', 'E1?', 'E2?'], 'V?'], target, table);
    },
    transform: function(table) {
        // ...your code here...
        return ['+', ['DERIV', table.E1, table.V], ['DERIV', table.E2, table.V]];
    },
    label: "diffSumRule"
};


//
// (u - v)' = u' - v'
//
var diffSubtractRule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['DERIV', ['-', 'E1?', 'E2?'], 'V?'], target, table);
    },
    transform: function(table) {
        // ...your code here...
        return ['-', ['DERIV', table.E1, table.V], ['DERIV', table.E2, table.V]];
    },
    label: "diffSubtractRule"
};

//
// d/dt C = 0   (C does not depend on t)
//
var diffConstRule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['DERIV', 'E?', 'V?'], target, table) &&
        			 (!(checkVariable(table.E, table.V)));
    },
    transform: function(table) {
        // ...your code here...
        return 0;
    },
    label: "diffConstRule"
};


function checkVariable(E, V){

	if(typeof E === 'object'){
		for(var index=0; index < E.length; index++){
			if(E[index] === V){
				return true;
			}
			else{
						if(checkVariable(E[index], V)){
						return true;
				}
			}
		}
	}
	return false;
}

//
// (u v)' = uv' + vu'
//
var diffProductRule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['DERIV', ['*', 'E1?', 'E2?'], 'V?'], target, table)
    },
    transform: function(table) {
        // ...your code here...
        return ['+', ['*', table.E2, ['DERIV', table.E1, table.V]], ['*', table.E1, ['DERIV', table.E2, table.V]]];
    },
    label: "diffProductRule"
};

//
// 3 + 4 = 7   (evaluate constant binary expressions)
//
var foldBinopRule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['op?', 'V1?', 'V2?'], target, table) &&
        				typeof table.V1 === "number" &&
        				typeof table.V2 === "number";
    },
    transform: function(table) {
        // ...your code here...
        if(table.op === '+') return table.V1 + table.V2;
        if(table.op === '-') return table.V1 - table.V2;
        if(table.op === '/') return table.V1 / table.V2;
        if(table.op === '^') return Math.pow(table.V1, table.V2);
        if(table.op === '*') return table.V1 * table.V2;
    },
    label: "foldBinopRule"
};

//
// 3*(2*E) = 6*E  : [*, a, [*, b, e]] => [*, (a*b), e]
//
var foldCoeff1Rule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['*', 'V1?', ['*', 'V2?', 'E?']], target, table) &&
        			 typeof table.V1 === "number" &&
        			 typeof table.V2 === "number";
    },
    transform: function(table) {
        // ...your code here...
        return ['*', (table.V1 * table.V2), table.E];
    },
    label: "foldCoeff1Rule"
};

//
//  x^0 = 1
//
var expt0Rule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['^', 'E?', 'V?'], target, table) && 
        			 typeof table.V === "number" && table.V === 0;
    },
    transform: function(table) {
        // ...your code here...
        return 1;
    },
    label: "expt0Rule"
};

//
//  x^1 = x
//
var expt1Rule = {
    pattern: function(target, table) {
        // ...your code here...
        return smatch(['^', 'E?', 'V?'], target, table) && 
        			 typeof table.V === "number" && 
        			 table.V === 1;
    },
    transform: function(table) {
        // ...your code here...
        return table.E;
    },
    label: "expt1Rule"
};

//
//  E * 1 = 1 * E = 0 + E = E + 0 = E
//
var unityRule = {
    pattern: function(target, table) {
        return (smatch(['+', 'E?', 'V?'], target, table) &&
		typeof table.E === "number" && table.E === 0) ||
	    (smatch(['+', 'V?', 'E?'], target, table) &&
	     typeof table.E === "number" && table.E === 0) ||
	    (smatch(['*', 'E?', 'V?'], target, table) &&
		typeof table.E === "number" && table.E === 1) ||
	    (smatch(['*', 'V?', 'E?'], target, table) &&
	     typeof table.E === "number" && table.E === 1); 
    },
    transform: function(table) {
			return table.V;
    },
    label: "unityRule"
};

//
// E * 0 = 0 * E = 0
//
var times0Rule = {
    pattern: function(target, table) {
        // ...your code here...
        return (smatch(['*', 'E?', 'V?'], target, table) && typeof table.V === "number" ||
        			 smatch(['*', 'V?', 'E?'], target, table) && typeof table.V === "number") &&
        			 table.V === 0;
    },
    transform: function(table) {
        // ...your code here...
        return 0;
    },
    label: "time0Rule"
};

//
// Try to apply "rule" to "expr" recursively -- rule may fire multiple times
// on subexpressions.
// Returns null if rule is *never* applied, else new transformed expression.
// 
function tryRule(rule, expr) {
    var table = {}
    if (!(expr instanceof Array))  // rule patterns match only arrays
        return null;
    else if (rule.pattern(expr, table)) { // rule matches whole expres
        console.log("rule " + rule.label + " fires.");
        return rule.transform(table);     // return transformed expression
    } else { // let's recursively try the rule on each subexpression
        var anyFire = false;
        var newExpr = expr.map(function(e) {
            var t = tryRule(rule, e);
            if (t !== null) {     // note : t = 0 is a valid expression
                anyFire = true;   // at least one rule fired
                return t;         // return transformed subexpression
            } else {
                return e;         // return original subexpression
            }
        });
        return anyFire ? newExpr : null;
    }
}

//
// Try transforming the given expression using all the rules.
// If any rules fire, we return the new transformed expression;
// Otherwise, null is returned.
//
function tryAllRules(expr) {
    var rules = [
				    diffPowerRule,
				    diffXRule,
						diffSumRule,
						diffSubtractRule,
						diffConstRule,
						diffProductRule,
						expt0Rule,
						expt1Rule,
						unityRule,
						times0Rule,
						foldBinopRule,
						foldCoeff1Rule
    			];

    var fire = false;
    rules.forEach((function(rule) {
		var newExpr = tryRule(rule, expr);
				if(newExpr) {
						expr = newExpr;
						fire = true;
				}}));
   
    return fire ? expr : null;
}

//
// Repeatedly try to reduce expression by applying rules.
// As soon as no more rules fire we are done.
//
function reduceExpr(expr) {
    var e = tryAllRules(expr);
    return (e != null) ? reduceExpr(e) : expr;
}

//if (diffPowerRule.pattern(['DERIV', ['^', 'X', 3], 'X'], table)) {
//     var f = diffPowerRule.transform(table);
//     console.log(f);
// }

//
// Node module exports.
//
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    exports.smatch = smatch;
    exports.diffPowerRule = diffPowerRule;
    exports.tryRule = tryRule;

    exports.diffXRule = diffXRule;
    exports.diffSumRule = diffSumRule;
    exports.diffConstRule = diffConstRule;
    exports.diffProductRule = diffProductRule;
    exports.foldBinopRule = foldBinopRule;
    exports.foldCoeff1Rule = foldCoeff1Rule;
    exports.expt0Rule = expt0Rule;
    exports.expt1Rule = expt1Rule;
    exports.unityRule = unityRule;
    exports.times0Rule = times0Rule;

    exports.tryAllRules = tryAllRules;
    exports.reduceExpr = reduceExpr;
}
