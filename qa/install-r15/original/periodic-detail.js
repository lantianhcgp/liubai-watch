/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 675:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var $app_template$ = __webpack_require__(119)
var $app_style$ = __webpack_require__(947)
var $app_script$ = __webpack_require__(558)
var options=$app_script$
 if ($app_script$.__esModule) {

      options = $app_script$.default;
 }
options.styleSheet=$app_style$
options.render=$app_template$;
module.exports=new ViewModel(options);

/***/ }),

/***/ 947:
/***/ (function(module) {

module.exports = {"classSelectors":{"page":{"width":"100%","height":"100%","backgroundColor":855318,"flexDirection":"column","alignItems":"center"},"dttl":{"width":"88%","height":18,"fontSize":10,"color":8358560,"letterSpacing":4,"marginTop":8},"hero":{"width":"88%","height":58,"flexDirection":"row","alignItems":"center","marginTop":6},"tile":{"width":54,"height":54,"borderRadius":14,"flexDirection":"column","alignItems":"center","justifyContent":"center","opacity":0.28},"tile-sym":{"fontSize":20,"color":15659770},"tile-num":{"fontSize":7,"color":"rgba(255,255,255,0.6)"},"names":{"flexDirection":"column","justifyContent":"center","marginLeft":10},"cn":{"fontSize":20,"color":15659770},"en":{"fontSize":9,"color":8358560,"marginTop":2},"tags":{"flexDirection":"row","alignItems":"center","marginTop":4},"cat":{"fontSize":8,"borderRadius":6,"paddingLeft":6,"paddingRight":6,"paddingTop":2,"paddingBottom":2},"coretag":{"fontSize":8,"color":16766285,"marginLeft":6},"mid":{"width":"88%","height":80,"flexDirection":"row","alignItems":"stretch","marginTop":5},"shellbox":{"width":104,"flexDirection":"column","justifyContent":"center"},"m-k":{"fontSize":8,"color":8358560,"letterSpacing":1},"shelltext":{"fontSize":15,"color":15659770,"marginTop":4},"confbox":{"width":250,"flexDirection":"column","justifyContent":"center","marginLeft":8},"conf":{"fontSize":10,"color":15659770,"backgroundColor":"rgba(255,255,255,0.05)","borderRadius":8,"paddingLeft":7,"paddingRight":7,"paddingTop":5,"paddingBottom":5,"marginTop":3},"oxline":{"fontSize":9,"color":10466520,"marginTop":4},"stats":{"width":"88%","height":44,"flexDirection":"row","alignItems":"center","justifyContent":"center","marginTop":5},"stat":{"width":114,"backgroundColor":"rgba(255,255,255,0.05)","borderRadius":10,"paddingLeft":8,"paddingRight":8,"paddingTop":6,"paddingBottom":6,"marginRight":5,"flexDirection":"column"},"stat-l":{"marginRight":0},"s-k":{"fontSize":8,"color":8358560},"s-v":{"fontSize":12,"color":15659770,"marginTop":2},"notes":{"width":"88%","height":70,"flexDirection":"column","marginTop":5},"n-k":{"fontSize":8,"color":8358560,"letterSpacing":1},"n-line":{"fontSize":9,"color":13621480,"marginTop":4},"backbtn":{"width":"88%","height":30,"marginTop":5,"backgroundColor":"rgba(255,255,255,0.055)","borderRadius":12,"alignItems":"center","justifyContent":"center"},"back-txt":{"fontSize":10,"color":10466520},"foot":{"width":"88%","height":40,"flexDirection":"row","alignItems":"center","justifyContent":"space-between","marginTop":7},"navb":{"width":104,"height":36,"backgroundColor":"rgba(255,255,255,0.055)","borderRadius":12,"flexDirection":"column","alignItems":"center","justifyContent":"center"},"navb-l":{"fontSize":8,"color":8358560},"navb-s":{"fontSize":11,"color":15659770},"prog":{"width":110,"flexDirection":"column","alignItems":"center"},"prog-idx":{"fontSize":11,"color":15659770},"prog-bar":{"width":90,"height":3,"backgroundColor":"rgba(255,255,255,0.1)","borderRadius":2,"marginTop":4},"prog-fill":{"height":3,"backgroundColor":3718648,"borderRadius":2},"prog-lab":{"fontSize":7,"color":8358560,"marginTop":3}}}

/***/ }),

/***/ 119:
/***/ (function(module) {

module.exports = function (vm) { var _vm = vm || this; return _c('div', {'staticClass' : ["page"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.headTtl}},'staticClass' : ["dttl"]} ),_c('div', {'staticClass' : ["hero"]} , [_c('div', {'staticClass' : ["tile"],'dynamicStyle' :{'backgroundColor' : function () {return _vm.catColor}}} , [_c('text', {'attrs' : {'value' : function () {return _vm.sym}},'staticClass' : ["tile-sym"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.idx}},'staticClass' : ["tile-num"]} )] ),_c('div', {'staticClass' : ["names"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.cn}},'staticClass' : ["cn"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.en}},'staticClass' : ["en"]} ),_c('div', {'staticClass' : ["tags"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.catLabel}},'staticClass' : ["cat"],'dynamicStyle' :{'color' : function () {return _vm.catColor}}} ),_i((function () {return _vm.core}),function(){return _c('text', {'attrs' : {'value' : function () {return (_vm.star)+ decodeURI('') +decodeURI('%20')+ decodeURI('') +(_vm.coreWord)}},'staticClass' : ["coretag"]} )})] )] )] ),_c('div', {'staticClass' : ["mid"]} , [_c('div', {'staticClass' : ["shellbox"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.kShell}},'staticClass' : ["m-k"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.shellText}},'staticClass' : ["shelltext"]} )] ),_c('div', {'staticClass' : ["confbox"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.kConf}},'staticClass' : ["m-k"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.conf}},'staticClass' : ["conf"]} ),_i((function () {return _vm.hasOx}),function(){return _c('text', {'attrs' : {'value' : function () {return (_vm.kOx)+ decodeURI('') +decodeURI('%20%20')+ decodeURI('') +(_vm.oxText)}},'staticClass' : ["oxline"]} )})] )] ),_c('div', {'staticClass' : ["stats"]} , [_c('div', {'staticClass' : ["stat"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.kAtomic}},'staticClass' : ["s-k"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.idx}},'staticClass' : ["s-v"]} )] ),_c('div', {'staticClass' : ["stat"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.kMass}},'staticClass' : ["s-k"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.w}},'staticClass' : ["s-v"]} )] ),_c('div', {'staticClass' : ["stat","stat-l"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.kPeriod}},'staticClass' : ["s-k"]} ),_c('text', {'attrs' : {'value' : function () {return (_vm.period)+ decodeURI('') +decodeURI('%20')+ decodeURI('') +(_vm.group)}},'staticClass' : ["s-v"]} )] )] ),_c('div', {'staticClass' : ["notes"]} , [_c('text', {'attrs' : {'value' : function () {return _vm.notesK}},'staticClass' : ["n-k"]} ),_l((function () {return _vm.notes}),function(nt,$idx){return _c('text', {'attrs' : {'value' : function () {return nt}},'staticClass' : ["n-line"]} )})] ),_c('div', {'staticClass' : ["backbtn"],'onBubbleEvents' : {'click' : _vm.onBack}} , [_c('text', {'attrs' : {'value' : function () {return (_vm.bBack)+ decodeURI('') +decodeURI('%20%C2%B7%20')+ decodeURI('') +(_vm.headTtl)}},'staticClass' : ["back-txt"]} )] ),_c('div', {'staticClass' : ["foot"]} , [_i((function () {return _vm.canPrev}),function(){return _c('div', {'staticClass' : ["navb"],'onBubbleEvents' : {'click' : _vm.onPrev}} , [_c('text', {'attrs' : {'value' : function () {return _vm.bPrev}},'staticClass' : ["navb-l"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.prevSym}},'staticClass' : ["navb-s"]} )] )}),_c('div', {'staticClass' : ["prog"]} , [_c('text', {'attrs' : {'value' : function () {return (_vm.idx)+ decodeURI('') +decodeURI('/')+ decodeURI('') +(_vm.total)}},'staticClass' : ["prog-idx"]} ),_c('div', {'staticClass' : ["prog-bar"]} , [_c('div', {'staticClass' : ["prog-fill"],'dynamicStyle' :{'width' : function () {return (_vm.barPct)+ decodeURI('') +decodeURI('%25')}}} )] ),_c('text', {'attrs' : {'value' : function () {return _vm.progLab}},'staticClass' : ["prog-lab"]} )] ),_i((function () {return _vm.canNext}),function(){return _c('div', {'staticClass' : ["navb","navb-next"],'onBubbleEvents' : {'click' : _vm.onNext}} , [_c('text', {'attrs' : {'value' : function () {return _vm.bNext}},'staticClass' : ["navb-l"]} ),_c('text', {'attrs' : {'value' : function () {return _vm.nextSym}},'staticClass' : ["navb-s"]} )] )})] )] ) }

/***/ }),

/***/ 22:
/***/ (function(__unused_webpack_module, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var FULL = [[1, "H", "\u6C22", "Hydrogen", "1.008", "nm", "1s1", [-1, 1], 1, ["\u5B87\u5B99\u4E2D\u542B\u91CF\u6700\u591A\u7684\u5143\u7D20\uFF1B\u6C27\u5316\u6001 -1\u3001+1", "\u540C\u4F4D\u7D20\uFF1A\u6C15 1H\u3001\u6C18 2H\u3001\u6C1A 3H", "\u6C34\u4E0E\u9178\u7684\u6838\u5FC3\u5143\u7D20\uFF1B\u6C22\u952E\u4F7F\u6C34\u7684\u6CB8\u70B9\u53CD\u5E38"], "1|IA", "1"], [2, "He", "\u6C26", "Helium", "4.003", "nob", "1s2", [], 1, ["\u7B2C\u4E00\u7A00\u6709\u6C14\u4F53\uFF0C\u6700\u5916\u5C42 2 \u4E2A\u7535\u5B50\u5373\u7A33\u5B9A", "\u65E0\u5316\u5408\u7269\uFF1B\u7528\u4E8E\u6C14\u7403\u3001\u4F4E\u6E29\u8D85\u5BFC"], "1|0\u65CF", "2"], [3, "Li", "\u9502", "Lithium", "6.94", "alk", "[He] 2s1", [1], 1, ["\u5F3A\u8FD8\u539F\u6027\uFF08\u5F31\u4E8E Na\uFF09\uFF1B\u9502\u7535\u6C60\u6B63\u6781\u6750\u6599", "\u7130\u8272\u53CD\u5E94\uFF1A\u7D2B\u7EA2\u8272"], "2|IA", "2,1"], [4, "Be", "\u94CD", "Beryllium", "9.012", "alk2", "[He] 2s2", [2], 1, ["BeO\u3001Be(OH)2 \u5747\u663E\u4E24\u6027\uFF08\u7C7B\u4F3C Al\uFF09", "\u8F7B\u91D1\u5C5E\uFF0C\u7528\u4E8E\u822A\u5929\u5408\u91D1"], "2|IIA", "2,2"], [5, "B", "\u787C", "Boron", "10.81", "met", "[He] 2s2 2p1", [3], 1, ["H3BO3 \u4E3A\u4E00\u5143\u5F31\u9178", "\u787C\u7845\u9178\u76D0\u73BB\u7483\u3001\u9676\u74F7"], "2|\u7B2CIII\u65CF", "2,3"], [6, "C", "\u78B3", "Carbon", "12.011", "nm", "[He] 2s2 2p2", [-4, 2, 4], 1, ["\u540C\u7D20\u5F02\u5F62\u4F53\uFF1A\u91D1\u521A\u77F3\u3001\u77F3\u58A8\u3001C60", "\u6C27\u5316\u6001 -4~+4\uFF1BCO\u3001CO2", "\u9AD8\u6E29\u4E0B\u4F5C\u8FD8\u539F\u5242\uFF08\u5DE5\u4E1A\u70BC\u94C1\uFF09"], "2|\u7B2CIV\u65CF", "2,4"], [7, "N", "\u6C2E", "Nitrogen", "14.007", "nm", "[He] 2s2 2p3", [-3, 2, 3, 4, 5], 1, ["\u7A7A\u6C14\u4E3B\u8981\u6210\u5206\uFF08\u7EA6 78%\uFF09", "NH3\u3001HNO3 \u4E3A\u91CD\u8981\u5DE5\u4E1A\u54C1\uFF1B\u6C2E\u80A5", "NO\u3001NO2 \u4E0E\u9178\u96E8\u3001\u5149\u5316\u5B66\u70DF\u96FE"], "2|\u7B2CV\u65CF", "2,5"], [8, "O", "\u6C27", "Oxygen", "15.999", "nm", "[He] 2s2 2p4", [-2, -1], 1, ["\u6C27\u5316\u6027\u6781\u5F3A\u7684\u975E\u91D1\u5C5E\uFF1B\u7A7A\u6C14\u4E2D\u7EA6 21%", "O2 \u4E0E O3 \u4E92\u4E3A\u540C\u7D20\u5F02\u5F62\u4F53", "Na2O2 \u542B\u8FC7\u6C27\u952E\uFF08O \u4E3A -1 \u4EF7\uFF09"], "2|\u7B2CVI\u65CF", "2,6"], [9, "F", "\u6C1F", "Fluorine", "18.998", "hal", "[He] 2s2 2p5", [-1], 1, ["\u6C27\u5316\u6027\u6700\u5F3A\u7684\u975E\u91D1\u5C5E\uFF0C\u65E0\u6B63\u4EF7", "F2 \u4E0E\u6C34\u53CD\u5E94\u653E\u51FA O2", "HF \u8150\u8680\u73BB\u7483\uFF1A4HF + SiO2 = SiF4\u2191 + 2H2O"], "2|\u7B2CVII\u65CF", "2,7"], [10, "Ne", "\u6C16", "Neon", "20.180", "nob", "[He] 2s2 2p6", [], 1, ["\u7A00\u6709\u6C14\u4F53\uFF1B\u9713\u8679\u706F\uFF08\u53D1\u7EA2\u5149\uFF09"], "2|\u2167\u65CF", "2,8"], [11, "Na", "\u94A0", "Sodium", "22.990", "alk", "[Ne] 3s1", [1], 1, ["\u5F3A\u8FD8\u539F\u6027\uFF0C\u4FDD\u5B58\u4E8E\u7164\u6CB9\u4E2D", "2Na + 2H2O = 2NaOH + H2\u2191", "\u7130\u8272\u53CD\u5E94\uFF1A\u9EC4\u8272"], "3|IA", "2,8,1"], [12, "Mg", "\u9541", "Magnesium", "24.305", "alk2", "[Ne] 3s2", [2], 1, ["\u5F3A\u8FD8\u539F\u6027\uFF1A2Mg + CO2 \u2192(\u70B9\u71C3) 2MgO + C", "MgO \u7194\u70B9\u9AD8 \u2192 \u8010\u706B\u6750\u6599", "\u6D77\u6C34\u63D0\u9541\uFF1A\u7535\u89E3\u7194\u878D MgCl2"], "3|IIA", "2,8,2"], [13, "Al", "\u94DD", "Aluminium", "26.982", "post", "[Ne] 3s2 3p1", [3], 1, ["\u5730\u58F3\u4E2D\u542B\u91CF\u6700\u9AD8\u7684\u91D1\u5C5E", "\u4E24\u6027\uFF1AAl(OH)3 \u4E0E\u9178\u3001\u78B1\u5747\u53CD\u5E94", "\u94DD\u70ED\u53CD\u5E94 2Al + Fe2O3 \u2192(\u9AD8\u6E29) 2Fe + Al2O3"], "3|\u7B2CIII\u65CF", "2,8,3"], [14, "Si", "\u7845", "Silicon", "28.085", "met", "[Ne] 3s2 3p2", [-4, 4], 1, ["\u6676\u4F53\u7845\uFF1A\u534A\u5BFC\u4F53\u3001\u592A\u9633\u80FD\u7535\u6C60", "SiO2\uFF1A\u5149\u5BFC\u7EA4\u7EF4\u3001\u77F3\u82F1", "\u7845\u9178\u76D0\uFF1A\u73BB\u7483\u3001\u6C34\u6CE5\u3001\u9676\u74F7"], "3|\u7B2CIV\u65CF", "2,8,4"], [15, "P", "\u78F7", "Phosphorus", "30.974", "nm", "[Ne] 3s2 3p3", [-3, 3, 5], 1, ["\u767D\u78F7\u5267\u6BD2\u3001\u6613\u81EA\u71C3\uFF0C\u4FDD\u5B58\u4E8E\u6C34\u4E2D", "\u7EA2\u78F7\u7A33\u5B9A \u2192 \u706B\u67F4\u5934", "P2O5 \u662F H3PO4 \u7684\u9178\u9150"], "3|\u7B2CV\u65CF", "2,8,5"], [16, "S", "\u786B", "Sulfur", "32.06", "nm", "[Ne] 3s2 3p4", [-2, 4, 6], 1, ["S + O2 \u2192(\u70B9\u71C3) SO2\uFF08\u4E0D\u80FD\u76F4\u63A5\u751F\u6210 SO3\uFF09", "SO2\uFF1A\u9178\u6027\u6C27\u5316\u7269 + \u6F02\u767D\u6027\uFF08\u53EF\u9006\uFF09", "\u5DE5\u4E1A\u5236\u786B\u9178\uFF1A\u63A5\u89E6\u6CD5\u4E09\u6B65"], "3|\u7B2CVI\u65CF", "2,8,6"], [17, "Cl", "\u6C2F", "Chlorine", "35.45", "hal", "[Ne] 3s2 3p5", [-1, 1, 3, 5, 7], 1, ["Cl2\uFF1A\u9EC4\u7EFF\u8272\u3001\u5F3A\u6C27\u5316\u6027", "\u6C2F\u6C34\u542B Cl2\u3001HCl\u3001HClO\uFF1BHClO \u6F02\u767D\u6D88\u6BD2", "Ag+ + Cl- = AgCl\u2193\uFF08\u767D\u8272\uFF0C\u4E0D\u6EB6\u4E8E\u7A00 HNO3\uFF09"], "3|\u7B2CVII\u65CF", "2,8,7"], [18, "Ar", "\u6C29", "Argon", "39.948", "nob", "[Ne] 3s2 3p6", [], 1, ["\u7A7A\u6C14\u4E2D\u542B\u91CF\u6700\u591A\u7684\u7A00\u6709\u6C14\u4F53\uFF08\u7EA6 0.93%\uFF09", "\u710A\u63A5\u4FDD\u62A4\u6C14"], "3|\u2167\u65CF", "2,8,8"], [19, "K", "\u94BE", "Potassium", "39.098", "alk", "[Ar] 4s1", [1], 1, ["\u8FD8\u539F\u6027\u5F3A\u4E8E Na", "\u7130\u8272\uFF1A\u7D2B\u8272\uFF08\u900F\u8FC7\u84DD\u8272\u94B4\u73BB\u7483\u89C2\u5BDF\uFF09"], "4|IA", "2,8,8,1"], [20, "Ca", "\u9499", "Calcium", "40.078", "alk2", "[Ar] 4s2", [2], 1, ["Ca(OH)2 \u77F3\u7070\u6C34\u68C0\u9A8C CO2", "CaO \u751F\u77F3\u7070\u4F5C\u5E72\u71E5\u5242", "CaC2 + H2O \u2192 C2H2\u2191\uFF08\u7535\u77F3\u5236\u4E59\u7094\uFF09"], "4|IIA", "2,8,8,2"], [21, "Sc", "\u94AA", "Scandium", "44.956", "tr", "[Ar] 3d1 4s2", [3], 0, [], "4|\u7B2CIII\u65CF", "2,8,9,2"], [22, "Ti", "\u949B", "Titanium", "47.867", "tr", "[Ar] 3d2 4s2", [4], 0, [], "4|\u7B2CIV\u65CF", "2,8,10,2"], [23, "V", "\u9492", "Vanadium", "50.942", "tr", "[Ar] 3d3 4s2", [5], 0, [], "4|\u7B2CV\u65CF", "2,8,11,2"], [24, "Cr", "\u94EC", "Chromium", "51.996", "tr", "[Ar] 3d5 4s1", [2, 3, 6], 1, ["Cr3+ \u7D2B\u8272\uFF1BCr2O72- \u6A59\u8272\uFF08\u5F3A\u6C27\u5316\u6027\uFF09", "Cr2O3 \u7EFF\u8272\uFF0C\u8010\u706B\u6750\u6599\u3001\u989C\u6599", "\u9540\u94EC\u9632\u9508"], "4|\u7B2CVI\u65CF", "2,8,12,2"], [25, "Mn", "\u9530", "Manganese", "54.938", "tr", "[Ar] 3d5 4s2", [2, 4, 7], 1, ["KMnO4 \u7D2B\u8272\uFF0C\u5F3A\u6C27\u5316\u6027\uFF08\u6EF4\u5B9A\u3001\u6D88\u6BD2\uFF09", "MnO2 \u50AC\u5316 H2O2 \u5206\u89E3\u5236 O2"], "4|\u7B2CVII\u65CF", "2,8,13,2"], [26, "Fe", "\u94C1", "Iron", "55.845", "tr", "[Ar] 3d6 4s2", [2, 3], 1, ["\u53D8\u4EF7 +2/+3\uFF1AFe2+ \u6D45\u7EFF\u3001Fe3+ \u9EC4\u8272", "Fe3+ + 3SCN- \u2192 \u8840\u7EA2\u8272\uFF08\u68C0\u9A8C Fe3+\uFF09", "\u94C1\u9508\u4E3B\u8981\u6210\u5206 Fe2O3\xB7nH2O"], "4|\u2167\u65CF", "2,8,14,2"], [27, "Co", "\u94B4", "Cobalt", "58.933", "tr", "[Ar] 3d7 4s2", [2, 3], 0, [], "4|\u2167\u65CF", "2,8,15,2"], [28, "Ni", "\u954D", "Nickel", "58.693", "tr", "[Ar] 3d8 4s2", [2], 0, [], "4|\u2167\u65CF", "2,8,16,2"], [29, "Cu", "\u94DC", "Copper", "63.546", "tr", "[Ar] 3d10 4s1", [1, 2], 1, ["Cu2+ \u84DD\u8272\u6EB6\u6DB2", "\u6E7F\u6CD5\u70BC\u94DC\uFF1AFe + CuSO4 = FeSO4 + Cu", "\u6D53 H2SO4 / \u6D53 HNO3 \u4E0E Cu \u53CD\u5E94"], "4|IB\u65CF", "2,8,17,2"], [30, "Zn", "\u950C", "Zinc", "65.38", "post", "[Ar] 3d10 4s2", [2], 1, ["\u767D\u94C1\u76AE\uFF08\u9540\u950C\uFF09\u9632\u9508", "\u950C\u9530\u5E72\u7535\u6C60\u8D1F\u6781", "\u91D1\u5C5E\u6D3B\u52A8\u6027 Zn > Fe"], "4|IIB\u65CF", "2,8,18,2"], [31, "Ga", "\u9553", "Gallium", "69.723", "post", "[Ar] 3d10 4s2 4p1", [3], 0, [], "4|IIIA", "2,8,18,3"], [32, "Ge", "\u9517", "Germanium", "72.630", "met", "[Ar] 3d10 4s2 4p2", [], 0, [], "4|IVA", "2,8,18,4"], [33, "As", "\u7837", "Arsenic", "74.922", "met", "[Ar] 3d10 4s2 4p3", [-3, 3, 5], 0, [], "4|VA", "2,8,18,5"], [34, "Se", "\u7852", "Selenium", "78.971", "nm", "[Ar] 3d10 4s2 4p4", [], 0, [], "4|VIA", "2,8,18,6"], [35, "Br", "\u6EB4", "Bromine", "79.904", "hal", "[Ar] 3d10 4s2 4p5", [-1, 1, 3, 5, 7], 1, ["\u7EA2\u68D5\u8272\u6613\u6325\u53D1\u6DB2\u4F53", "\u6C27\u5316\u6027\u987A\u5E8F\uFF1ACl2 > Br2 > I2", "\u7528\u6DC0\u7C89 KI \u8BD5\u7EB8\u68C0\u9A8C Br2"], "4|VIIA", "2,8,18,7"], [36, "Kr", "\u6C2A", "Krypton", "83.798", "nob", "[Ar] 3d10 4s2 4p6", [], 0, [], "4|0\u65CF", "2,8,18,8"], [37, "Rb", "\u94F7", "Rubidium", "85.468", "alk", "[Kr] 5s1", [1], 0, [], "5|IA", "2,8,18,8,1"], [38, "Sr", "\u9536", "Strontium", "87.62", "alk2", "[Kr] 5s2", [2], 0, [], "5|IIA", "2,8,18,8,2"], [39, "Y", "\u9487", "Yttrium", "88.906", "tr", "[Kr] 4d1 5s2", [3], 0, [], "5|\u7B2CIII\u65CF", "2,8,18,9,2"], [40, "Zr", "\u9506", "Zirconium", "91.224", "tr", "[Kr] 4d2 5s2", [4], 0, [], "5|\u7B2CIV\u65CF", "2,8,18,10,2"], [41, "Nb", "\u94CC", "Niobium", "92.906", "tr", "[Kr] 4d4 5s1", [5], 0, [], "5|\u7B2CV\u65CF", "2,8,18,11,2"], [42, "Mo", "\u94BC", "Molybdenum", "95.95", "tr", "[Kr] 4d5 5s1", [6], 0, [], "5|\u7B2CVI\u65CF", "2,8,18,12,2"], [43, "Tc", "\u951D", "Technetium", "98", "tr", "[Kr] 4d5 5s2", [7], 0, [], "5|\u7B2CVII\u65CF", "2,8,18,13,2"], [44, "Ru", "\u948C", "Ruthenium", "101.07", "tr", "[Kr] 4d7 5s1", [3], 0, [], "5|\u2167\u65CF", "2,8,18,14,2"], [45, "Rh", "\u94D1", "Rhodium", "102.91", "tr", "[Kr] 4d8 5s1", [3], 0, [], "5|\u2167\u65CF", "2,8,18,15,2"], [46, "Pd", "\u94AF", "Palladium", "106.42", "tr", "[Kr] 4d10", [2], 0, [], "5|\u2167\u65CF", "2,8,18,16,2"], [47, "Ag", "\u94F6", "Silver", "107.87", "tr", "[Kr] 4d10 5s1", [1], 1, ["AgNO3 \u68C0\u9A8C Cl-\uFF1AAgCl \u767D\u8272\u4E0D\u6EB6\u4E8E\u7A00 HNO3", "\u611F\u5149\uFF1A2AgBr \u2192(\u5149\u7167) 2Ag + Br2", "\u5BFC\u7535\u5BFC\u70ED\u6027\u597D\uFF0C\u5E38\u7528\u5668\u76BF\u3001\u5BFC\u7EBF"], "5|IB\u65CF", "2,8,18,17,2"], [48, "Cd", "\u9549", "Cadmium", "112.41", "post", "[Kr] 4d10 5s2", [2], 0, [], "5|IIB\u65CF", "2,8,18,18,2"], [49, "In", "\u94DF", "Indium", "114.82", "post", "[Kr] 4d10 5s2 5p1", [3], 0, [], "5|IIIA", "2,8,18,18,3"], [50, "Sn", "\u9521", "Tin", "118.71", "post", "[Kr] 4d10 5s2 5p2", [2, 4], 1, ["\u9A6C\u53E3\u94C1\uFF08\u9540\u9521\uFF09\u9632\u9508", "SnO2\uFF1A\u73BB\u7483\u3001\u9676\u74F7\u91C9\u6599", "\u8010\u8150\u8680\uFF0C\u4F20\u7EDF\u9521\u5668"], "5|IVA", "2,8,18,18,4"], [51, "Sb", "\u9511", "Antimony", "121.76", "met", "[Kr] 4d10 5s2 5p3", [], 0, [], "5|VA", "2,8,18,18,5"], [52, "Te", "\u78B2", "Tellurium", "127.60", "met", "[Kr] 4d10 5s2 5p4", [], 0, [], "5|VIA", "2,8,18,18,6"], [53, "I", "\u7898", "Iodine", "126.90", "hal", "[Kr] 4d10 5s2 5p5", [-1, 1, 3, 5, 7], 1, ["\u7D2B\u9ED1\u8272\u56FA\u4F53\uFF0C\u6613\u5347\u534E", "\u6DC0\u7C89\u9047 I2 \u53D8\u84DD\uFF08\u68C0\u9A8C I2\uFF09", "\u7F3A\u7898 \u2192 \u7532\u72B6\u817A\u80BF\u5927"], "5|VIIA", "2,8,18,18,7"], [54, "Xe", "\u6C19", "Xenon", "131.29", "nob", "[Kr] 4d10 5s2 5p6", [], 0, [], "5|0\u65CF", "2,8,18,18,8"], [55, "Cs", "\u94EF", "Caesium", "132.91", "alk", "[Xe] 6s1", [1], 0, [], "6|IA", "2,8,18,18,8,1"], [56, "Ba", "\u94A1", "Barium", "137.33", "alk2", "[Xe] 6s2", [2], 1, ["BaCl2 \u68C0\u9A8C SO42-\uFF1ABaSO4 \u4E0D\u6EB6\u4E8E\u9178", "Ba2+ \u6709\u6BD2\uFF1B\u201C\u94A1\u9910\u201D\u7528 BaSO4"], "6|IIA", "2,8,18,18,8,2"], [57, "La", "\u9567", "Lanthanum", "138.91", "lan", "[Xe] 5d1 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,19,8,2"], [58, "Ce", "\u94C8", "Cerium", "140.12", "lan", "[Xe] 4f1 5d1 6s2", [3, 4], 0, [], "6|\u9567\u7CFB", "2,8,18,20,8,2"], [59, "Pr", "\u9568", "Praseodymium", "140.91", "lan", "[Xe] 4f3 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,21,8,2"], [60, "Nd", "\u9495", "Neodymium", "144.24", "lan", "[Xe] 4f4 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,22,8,2"], [61, "Pm", "\u94B7", "Promethium", "145", "lan", "[Xe] 4f5 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,23,8,2"], [62, "Sm", "\u9490", "Samarium", "150.36", "lan", "[Xe] 4f6 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,24,8,2"], [63, "Eu", "\u94D5", "Europium", "151.96", "lan", "[Xe] 4f7 6s2", [2, 3], 0, [], "6|\u9567\u7CFB", "2,8,18,25,8,2"], [64, "Gd", "\u9486", "Gadolinium", "157.25", "lan", "[Xe] 4f7 5d1 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,26,8,2"], [65, "Tb", "\u94FD", "Terbium", "158.93", "lan", "[Xe] 4f9 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,27,8,2"], [66, "Dy", "\u955D", "Dysprosium", "162.50", "lan", "[Xe] 4f10 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,28,8,2"], [67, "Ho", "\u94AC", "Holmium", "164.93", "lan", "[Xe] 4f11 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,29,8,2"], [68, "Er", "\u94D2", "Erbium", "167.26", "lan", "[Xe] 4f12 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,30,8,2"], [69, "Tm", "\u94E5", "Thulium", "168.93", "lan", "[Xe] 4f13 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,31,8,2"], [70, "Yb", "\u9571", "Ytterbium", "173.05", "lan", "[Xe] 4f14 6s2", [2, 3], 0, [], "6|\u9567\u7CFB", "2,8,18,32,8,2"], [71, "Lu", "\u9565", "Lutetium", "174.97", "lan", "[Xe] 4f14 5d1 6s2", [3], 0, [], "6|\u9567\u7CFB", "2,8,18,32,9,2"], [72, "Hf", "\u94EA", "Hafnium", "178.49", "tr", "[Xe] 4f14 5d2 6s2", [4], 0, [], "6|\u7B2CIV\u65CF", "2,8,18,32,10,2"], [73, "Ta", "\u94BD", "Tantalum", "180.95", "tr", "[Xe] 4f14 5d3 6s2", [5], 0, [], "6|\u7B2CV\u65CF", "2,8,18,32,11,2"], [74, "W", "\u94A8", "Tungsten", "183.84", "tr", "[Xe] 4f14 5d4 6s2", [4, 5, 6], 1, ["\u7194\u70B9\u6700\u9AD8\u7684\u91D1\u5C5E\uFF08\u7EA6 3400\xB0C\uFF09", "\u767D\u70BD\u706F\u706F\u4E1D\u6750\u6599", "\u786C\u8D28\u5408\u91D1\uFF08\u94A8\u94A2\uFF09"], "6|\u7B2CVI\u65CF", "2,8,18,32,12,2"], [75, "Re", "\u94FC", "Rhenium", "186.21", "tr", "[Xe] 4f14 5d5 6s2", [7], 0, [], "6|\u7B2CVII\u65CF", "2,8,18,32,13,2"], [76, "Os", "\u9507", "Osmium", "190.23", "tr", "[Xe] 4f14 5d6 6s2", [4], 0, [], "6|\u2167\u65CF", "2,8,18,32,14,2"], [77, "Ir", "\u94F1", "Iridium", "192.22", "tr", "[Xe] 4f14 5d7 6s2", [4], 0, [], "6|\u2167\u65CF", "2,8,18,32,15,2"], [78, "Pt", "\u94C2", "Platinum", "195.08", "tr", "[Xe] 4f14 5d9 6s1", [2, 4], 1, ["\u6781\u4E0D\u6D3B\u6CFC\uFF0C\u8010\u8150\u8680", "\u6C7D\u8F66\u5C3E\u6C14\u4E09\u5143\u50AC\u5316\u5668\u542B Pt", "\u6C22\u6C27\u71C3\u6599\u7535\u6C60\u7535\u6781\u6750\u6599"], "6|\u2167\u65CF", "2,8,18,32,16,2"], [79, "Au", "\u91D1", "Gold", "196.97", "tr", "[Xe] 4f14 5d10 6s1", [1, 3], 1, ["\u6781\u4E0D\u6D3B\u6CFC\uFF0C\u201C\u771F\u91D1\u4E0D\u6015\u706B\u70BC\u201D", "\u738B\u6C34 = \u6D53 HNO3 : \u6D53 HCl = 1 : 3", "\u5EF6\u5C55\u6027\u6700\u597D\u7684\u91D1\u5C5E"], "6|IB\u65CF", "2,8,18,32,17,2"], [80, "Hg", "\u6C5E", "Mercury", "200.59", "post", "[Xe] 4f14 5d10 6s2", [1, 2], 1, ["\u552F\u4E00\u5E38\u6E29\u4E0B\u5448\u6DB2\u6001\u7684\u91D1\u5C5E", "\u6E29\u5EA6\u8BA1\u3001\u6C14\u538B\u8BA1\uFF1B\u6C5E\u84B8\u6C14\u6709\u6BD2", "2Hg + O2 \u2192(\u52A0\u70ED) 2HgO"], "6|IIB\u65CF", "2,8,18,32,18,2"], [81, "Tl", "\u94CA", "Thallium", "204.38", "post", "[Xe] 4f14 5d10 6s2 6p1", [1, 3], 0, [], "6|IIIA", "2,8,18,32,18,3"], [82, "Pb", "\u94C5", "Lead", "207.2", "post", "[Xe] 4f14 5d10 6s2 6p2", [2, 4], 1, ["\u94C5\u84C4\u7535\u6C60\uFF1A\u6B63\u6781 PbO2\u3001\u8D1F\u6781 Pb\u3001H2SO4", "\u94C5\u4E2D\u6BD2\uFF1B\u94C5\u5B57\u5370\u5237\u65F6\u4EE3"], "6|IVA", "2,8,18,32,18,4"], [83, "Bi", "\u94CB", "Bismuth", "208.98", "post", "[Xe] 4f14 5d10 6s2 6p3", [3, 5], 0, [], "6|VA", "2,8,18,32,18,5"], [84, "Po", "\u948B", "Polonium", "209", "post", "[Xe] 4f14 5d10 6s2 6p4", [2, 4], 0, [], "6|VIA", "2,8,18,32,18,6"], [85, "At", "\u7839", "Astatine", "210", "hal", "[Xe] 4f14 5d10 6s2 6p5", [-1], 0, [], "6|VIIA", "2,8,18,32,18,7"], [86, "Rn", "\u6C21", "Radon", "222", "nob", "[Xe] 4f14 5d10 6s2 6p6", [], 0, [], "6|0\u65CF", "2,8,18,32,18,8"], [87, "Fr", "\u94AB", "Francium", "223", "alk", "[Rn] 7s1", [1], 0, [], "7|IA", "2,8,18,32,18,8,1"], [88, "Ra", "\u956D", "Radium", "226", "alk2", "[Rn] 7s2", [2], 0, [], "7|IIA", "2,8,18,32,18,8,2"], [89, "Ac", "\u9515", "Actinium", "227", "act", "[Rn] 6d1 7s2", [3], 0, [], "7|\u9515\u7CFB", "2,8,18,32,19,8,2"], [90, "Th", "\u948D", "Thorium", "232.04", "act", "[Rn] 6d2 7s2", [4], 0, [], "7|\u9515\u7CFB", "2,8,18,32,20,8,2"], [91, "Pa", "\u9564", "Protactinium", "231.04", "act", "[Rn] 5f2 6d1 7s2", [5], 0, [], "7|\u9515\u7CFB", "2,8,18,32,21,8,2"], [92, "U", "\u94C0", "Uranium", "238.03", "act", "[Rn] 5f3 6d1 7s2", [3, 4, 6], 0, ["\u6838\u88C2\u53D8\u71C3\u6599 235U"], "7|\u9515\u7CFB", "2,8,18,32,22,8,2"], [93, "Np", "\u954E", "Neptunium", "237", "act", "[Rn] 5f4 6d1 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,23,8,2"], [94, "Pu", "\u949A", "Plutonium", "244", "act", "[Rn] 5f6 7s2", [3, 4], 0, [], "7|\u9515\u7CFB", "2,8,18,32,24,8,2"], [95, "Am", "\u9545", "Americium", "243", "act", "[Rn] 5f7 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,25,8,2"], [96, "Cm", "\u9514", "Curium", "247", "act", "[Rn] 5f7 6d1 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,26,8,2"], [97, "Bk", "\u952B", "Berkelium", "247", "act", "[Rn] 5f9 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,27,8,2"], [98, "Cf", "\u950E", "Californium", "251", "act", "[Rn] 5f10 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,28,8,2"], [99, "Es", "\u953F", "Einsteinium", "252", "act", "[Rn] 5f11 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,29,8,2"], [100, "Fm", "\u9544", "Fermium", "257", "act", "[Rn] 5f12 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,30,8,2"], [101, "Md", "\u9494", "Mendelevium", "258", "act", "[Rn] 5f13 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,31,8,2"], [102, "No", "\u9518", "Nobelium", "259", "act", "[Rn] 5f14 7s2", [], 0, [], "7|\u9515\u7CFB", "2,8,18,32,32,8,2"], [103, "Lr", "\u94F9", "Lawrencium", "258", "post", "[Rn] 5f14 6d1 7s2", [3], 0, [], "7|\u9515\u7CFB", "2,8,18,32,32,9,2"], [104, "Rf", "\uD872\uDF3B", "Rutherfordium", "267", "tr", "[Rn] 5f14 6d2 7s2", [], 0, [], "7|\u7B2CIV\u65CF", "2,8,18,32,32,10,2"], [105, "Db", "\uD872\uDF44", "Dubnium", "268", "tr", "5f14 6d3 7s2", [], 0, [], "7|\u7B2CV\u65CF", "2,8,18,32,32,11,2"], [106, "Sg", "\uD872\uDF73", "Seaborgium", "271", "tr", "5f14 6d4 7s2", [], 0, [], "7|\u7B2CVI\u65CF", "2,8,18,32,32,12,2"], [107, "Bh", "\uD872\uDF76", "Bohrium", "270", "tr", "5f14 6d5 7s2", [], 0, [], "7|\u7B2CVII\u65CF", "2,8,18,32,32,13,2"], [108, "Hs", "\uD872\uDF7F", "Hassium", "277", "tr", "5f14 6d6 7s2", [], 0, [], "7|\u2167\u65CF", "2,8,18,32,32,14,2"], [109, "Mt", "\u9FCF", "Meitnerium", "278", "tr", "5f14 6d7 7s2", [], 0, [], "7|\u2167\u65CF", "2,8,18,32,32,15,2"], [110, "Ds", "\uD872\uDF6D", "Darmstadtium", "281", "tr", "5f14 6d8 7s2", [], 0, [], "7|\u2167\u65CF", "2,8,18,32,32,16,2"], [111, "Rg", "\u9FED", "Roentgenium", "282", "tr", "5f14 6d9 7s2", [], 0, [], "7|IB\u65CF", "2,8,18,32,32,17,2"], [112, "Cn", "\u9FD4", "Copernicium", "285", "post", "5f14 6d10 7s2", [], 0, [], "7|IIB\u65CF", "2,8,18,32,32,18,2"], [113, "Nh", "\u9268", "Nihonium", "288", "post", "6d10 7s2 7p1", [], 0, [], "7|IIIA", "2,8,18,32,32,18,3"], [114, "Fl", "\uD86D\uDCE7", "Flerovium", "290", "post", "6d10 7s2 7p2", [], 0, [], "7|IVA", "2,8,18,32,32,18,4"], [115, "Mc", "\u9546", "Moscovium", "291", "post", "6d10 7s2 7p3", [], 0, [], "7|VA", "2,8,18,32,32,18,5"], [116, "Lv", "\uD86D\uDFF7", "Livermorium", "293", "post", "6d10 7s2 7p4", [], 0, [], "7|VIA", "2,8,18,32,32,18,6"], [117, "Ts", "\u9FEC", "Tennessine", "294", "hal", "6d10 7s2 7p5", [], 0, [], "7|VIIA", "2,8,18,32,32,18,7"], [118, "Og", "\u9FEB", "Oganesson", "294", "nob", "6d10 7s2 7p6", [], 0, [], "7|0\u65CF", "2,8,18,32,32,18,8"]];
var _default = FULL;
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 558:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _elementsFull = _interopRequireDefault(__webpack_require__(22));
var CAT = {
  alk: {
    label: "\u78B1\u91D1\u5C5E",
    c: '#ff6b6b'
  },
  alk2: {
    label: "\u78B1\u571F\u91D1\u5C5E",
    c: '#ffa94d'
  },
  tr: {
    label: "\u8FC7\u6E21\u91D1\u5C5E",
    c: '#5c7cfa'
  },
  post: {
    label: "\u540E\u8FC7\u6E21\u91D1\u5C5E",
    c: '#4dabf7'
  },
  met: {
    label: "\u7C7B\u91D1\u5C5E",
    c: '#69db7c'
  },
  nm: {
    label: "\u975E\u91D1\u5C5E",
    c: '#ffd43b'
  },
  hal: {
    label: "\u5318\u7D20",
    c: '#f783ac'
  },
  nob: {
    label: "\u7A00\u6709\u6C14\u4F53",
    c: '#b197fc'
  },
  lan: {
    label: "\u956D\u7CFB",
    c: '#22d3ee'
  },
  act: {
    label: "\u9551\u7CFB",
    c: '#818cf8'
  }
};
function byZ(z) {
  var r = _elementsFull["default"][z - 1];
  return r ? r : null;
}
function fill(page) {
  var el = byZ(page.z);
  if (!el) {
    page.hasData = 0;
    return;
  }
  page.hasData = 1;
  page.sym = el[1];
  page.cn = el[2];
  page.en = el[3];
  page.w = el[4];
  var cat = CAT[el[5]] || {
    label: el[5],
    c: '#888'
  };
  page.catLabel = cat.label;
  page.catColor = cat.c;
  page.conf = el[6];
  var ox = el[7] || [];
  var oxText = '';
  for (var i = 0; i < ox.length; i++) {
    if (i) {
      oxText += ' ';
    }
    oxText += (ox[i] > 0 ? '+' : '') + ox[i];
  }
  page.oxText = oxText;
  page.hasOx = ox.length > 0 ? 1 : 0;
  page.core = el[8] ? 1 : 0;
  var notes = el[9] || [];
  var shown = notes.slice(0, 3);
  if (!shown.length) {
    shown = el[8] ? [] : ["\u975E\u9AD8\u8003\u6838\u5FC3\u8003\u70B9\uFF0C\u8BB0\u4F4F\u7B26\u53F7\u4E0E\u4F4D\u7F6E\u5373\u53EF"];
  }
  page.notes = shown;
  page.notesK = el[8] ? "\u9AD8\u8003\u8981\u70B9" : "\u7B80\u4ECB";
  var pg = (el[10] || '').split('|');
  page.period = pg[0] || '';
  page.group = pg[1] || '';
  var sh = (el[11] || '').split(',');
  var shells = [];
  for (var s = 0; s < sh.length; s++) {
    if (sh[s]) {
      shells.push({
        n: sh[s]
      });
    }
  }
  page.shells = shells;
  page.shellText = sh.join(' ');
  page.idx = el[0];
  page.total = 118;
  page.barPct = Math.round(el[0] / 118 * 100);
  var prev = byZ(el[0] - 1);
  var next = byZ(el[0] + 1);
  page.prevSym = prev ? prev[1] : '';
  page.nextSym = next ? next[1] : '';
  page.canPrev = prev ? 1 : 0;
  page.canNext = next ? 1 : 0;
}
var _default = {
  data: {
    z: 1,
    hasData: 0,
    sym: '',
    cn: '',
    en: '',
    w: '',
    catLabel: '',
    catColor: '#888',
    conf: '',
    oxText: '',
    hasOx: 0,
    core: 0,
    notes: [],
    notesK: '',
    period: '',
    group: '',
    shells: [],
    shellText: '',
    idx: 0,
    total: 118,
    barPct: 0,
    prevSym: '',
    nextSym: '',
    canPrev: 0,
    canNext: 0,
    headTtl: "\u5143 \u7D20 \u8BE6 \u60C5",
    kPeriod: "\u5468\u671F \xB7 \u65CF",
    kAtomic: "\u539F\u5B50\u5E8F\u6570",
    kMass: "\u76F8\u5BF9\u539F\u5B50\u8D28\u91CF",
    kConf: "\u7535\u5B50\u6392\u5E03",
    kShell: "\u7535\u5B50\u5C42",
    kOx: "\u5E38\u89C1\u5316\u5408\u4EF7",
    bPrev: "\u4E0A\u4E00",
    bNext: "\u4E0B\u4E00",
    bBack: "\u8FD4\u56DE",
    star: "\u2605",
    coreWord: "\u9AD8\u8003\u6838\u5FC3",
    progLab: "\u7FFB\u9605"
  },
  onInit: function onInit() {
    var self = this;
    var storage = requireModule('@system.storage');
    storage.get({
      key: 'pt_z',
      "default": '1',
      success: function success(v) {
        var z = parseInt(v, 10);
        if (!z || z < 1 || z > 118) {
          z = 1;
        }
        self.z = z;
        fill(self);
      }
    });
  },
  go: function go(d) {
    var nz = this.z + d;
    if (nz < 1 || nz > 118) {
      return;
    }
    this.z = nz;
    fill(this);
  },
  onPrev: function onPrev() {
    this.go(-1);
  },
  onNext: function onNext() {
    this.go(1);
  },
  onBack: function onBack() {
    var router = requireModule('@system.router');
    router.replace({
      uri: 'pages/index/index'
    });
  }
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 143:
/***/ (function(module) {

"use strict";


function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(675);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=detail.js.map