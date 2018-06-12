//==========================================
// jqRazorGrid 0.6
//==========================================
// Copyright (c) 2012 Paul Phillips - All Rights Reserved
// Date 			: 19-Sep-2012
//==========================================
// Licensing 	: Dual licensed under the MIT (MIT-LICENSE.txt)
//						and GPL (GPL-LICENSE.txt) licenses.
//==========================================

(function( $ ) {
	$.fn.hasScrollBar = function() {
		var result = 'none';		
		
		if (this.get(0).scrollHeight > this.height()) result='vertical';
		
		if (this.get(0).scrollWidth > this.width()) {
			if (result == 'vertical') {
				result = 'both';
			} else {
				result = 'horizontal';
			}			
		};
		return result;
	}
})(jQuery);

(function( $ ){

	var filtTimer;
	var variableWidth = false;
	var variableHeight = false;	
	
	if (!Array.prototype.filter) {
	  Array.prototype.filter = function(fun /*, thisp*/) {
		var len = this.length >>> 0;
		if (typeof fun != "function")
		throw new TypeError();

		var res = [];
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
		  if (i in this) {
			var val = this[i]; // in case fun mutates this
			if (fun.call(thisp, val, i, this))
			res.push(val);
		  }
		}
		return res;
	  };
	}	

	var methods = {
  
//==========================================  
	init : function( options ) {
//==========================================	

		var settings = $.extend( {
			'page'						: 1,
			'limit'						: 6,
			'sord'						: '',
			'sidx'						: '',
			'where'						: '',
			'colModel'     				: [],
			'colNames'					: [],
			'filteredFields'			: [],
			'source'					: 'local',
			'url'						: '',
			'data'						: '',
			'master_data'				: '',
			'scroll_gutter'				: 18,
			'hideNull'					: true,
			'sortable'					: true,
			'wantFooter'				: true,
			'wantFooterRefresh'			: false,
			'wantFilter'				: false,
			'wantRowEdit'				: false,
			'wantRoundedHeaders'		: true,
			'wantAutoColWidth'			: '',
			'noScrollbars'				: false,
			'expandGrid'				: false,
			'frozenRows'				: 0,
			'frozenCols'				: 0,
			'wantFrozenHighlight'		: true,			
			'idField'					: '',
			'isEditing'					: false,
			'dateFormat'   				: 'dd/mm/yyyy',
			'rowHoverHighlight'			: true,
			'onLoadComplete'			: function() {},
			'onInitComplete'			: function() {},
			'onMouseOver'				: function(cell) {},
			'onMouseOut'				: function(cell) {},
			'onMouseDown'				: function(cell) {},
			'onMouseUp'					: function(cell) {},
			'onDataClick'				: function(cell) {},
			'onPageUp'					: function(obj) {},
			'onPageDown'				: function(obj) {},
			'onPageFirst'				: function(obj) {},
			'onPageLast'				: function(obj) {},
			'beforeRefresh'				: function($this, settings) {},
			'beforeLoad'				: function($this, settings) {},
			'onSortOrderChange'			: function(colID, order) {},
			'filterFiringDuration' 		: 700
		}, options);
			

		return this.each(function(){

			var $this = $(this),
				data = $this.data('razorGrid'),				
				razorGrid = $('<div />', {text : $this.attr('title') });
				$this.data('settings',settings);
				
			//==================================
			// If the plugin hasn't been initialized yet
			//==================================
			
			if ( ! data ) {
			
				loadGrid($this, settings, true);
				
				$this.data('settings',settings);
				
         }
       });
		},
//==========================================		
		refresh : function() {
//==========================================	

			try {
	
				var $this = $(this);
				var settings = $(this).data('settings');	
				
				//alert(JSON.stringify(settings));
				
				refreshData($this, settings);
			
			}
			catch(e){
				alert('[refresh] Error:'+e.message);
			}				
			
		},		
//==========================================		
		reload : function() {
//==========================================		

			try {

				var $this = $(this);
				var settings = $(this).data('settings');	
				
				//alert(JSON.stringify(settings));
				//alert('reload');
						
				
				loadGrid($this, settings, false);
			
			}
			catch(e){
				alert('[reload] Error:'+e.message);
			}				
			
		},		
//==========================================		
		updateData : function(sampData) {
//==========================================	

			try {
	
				var $this = $(this);
				var settings = $(this).data('settings');	
				
				//alert(JSON.stringify(settings));
				
				settings.data = sampData;
				
				$this.data('settings',settings);
			
			}
			catch(e){
				alert('[updateData] Error:'+e.message);
			}				
			
		},		
//==========================================		
		removeCol : function(gridName, colID) {
//==========================================		

			try {

				var $this = $(this);
				var settings = $(this).data('settings');	
				
				//alert(findInArray(settings.colModel, 'name', colID));
				
				if (settings.colModel[findInArray(settings.colModel, 'name', colID)]) {
					settings.colModel[findInArray(settings.colModel, 'name', colID)]['hidden'] = true;
				}
				
				$this.data('settings',settings);
			
			}
			catch(e){
				alert('[removeCol] Error:'+e.message);
			}	
			
		},	  
//==========================================		
		refreshSortOrder : function(colID, order) {
//==========================================		

			try {

				var $this = $(this);
				var settings = $(this).data('settings');	
				
				settings.sidx = colID;
				settings.sord = order;
				loadGrid($this, settings);
				
			}
			catch(e){
				alert('[refreshSortOrder] Error:'+e.message);
			}				
			
		},	  
//==========================================		
		resize : function () {	
//==========================================		

			try {

				var $this = $(this);
				var settings = $(this).data('settings');	
							
				setTimeout(function(){			
					//refreshGridHeaders($this.attr('id'), settings);						
					//refreshDataGridSize($this, settings);
					$(window).resize();
				},10);
				
			}
			catch(e){
				alert('[resize] Error:'+e.message);
			}				
			
		},
//==========================================		
		movePageUp : function () {
//==========================================		

			try {
			
				var $this = $(this);
				var settings = $(this).data('settings');	
				
				settings.page = settings.page + 1;
				$('#'+$this.attr('id')+' #footer_text').html('Loading');
				loadGrid($this, settings,'');
				
				$this.data('settings',settings);
			
			}
			catch(e){
				alert('[movePageUp] Error:'+e.message);
			}			
			
		},
//==========================================		
		movePageDown : function () {
//==========================================		

			try {

				var $this = $(this);
				var settings = $(this).data('settings');	  		
						
				//alert(testName);
				settings.page = settings.page - 1;
				$('#'+$this.attr('id')+' #footer_text').html('Loading');
				loadGrid($this, settings,'');
				
				$this.data('settings',settings);
				
			}
			catch(e){
				alert('[movePageDown] Error:'+e.message);
			}			
			
		},	  
//==========================================		
		getRowIDs : function () {
//==========================================	

			try {
	
				var $this = $(this);
				var rowIDs = [];
					
				$.each($('#dataGrid tr', $this), function(idx,obj) {
					rowIDs.push($(obj).attr('row_id'));
				});
				
				return rowIDs;
			
			}
			catch(e){
				alert('[getRowIDs] Error:'+e.message);
			}				
			
		},
//==========================================		
		destroy : function( ) {
//==========================================		

			try {

				return this.each(function(){

				var $this = $(this), data = $this.data('razorGrid');

				//==================================
				// Namespacing FTW
				//==================================
				
				$(window).unbind('.razorGrid');
				data.razorGrid.remove();
				$this.removeData('razorGrid');

				})
				
			}
			catch(e){
				alert('[destroy] Error:'+e.message);
			}					
		}
	};
	
//=========================
	function findInArray(ary, field, value) {
//=========================

		try {

			var retVal = -1;

			for(var j=0;j<ary.length;j++){
				if (ary[j][field] == value) retVal = j;
			}
			
			return retVal;
			
		}
		catch(e){
			alert('[findInArray] Error:'+e.message);
		}				
			
	}

//=============================================		
	function Left(str, n){
//=============================================		
		if (n <= 0)
			 return "";
		else if (n > String(str).length)
			 return str;
		else
			 return String(str).substring(0,n);
	}
	
//=============================================		
	function Right(str, n){
//=============================================		
		 if (n <= 0)
			 return "";
		 else if (n > String(str).length)
			 return str;
		 else {
			 var iLen = String(str).length;
			 return String(str).substring(iLen, iLen - n);
		 }
	}	
	
//==========================================	
	function loadGrid($this, settings, isInit) {
//==========================================

		var resizeTimer;

		settings.beforeLoad($this, settings);
		
		//var HTMLtoHide = $('#'+$this.attr('id')+' #grid_wrapper').html();
		
		$this.css({'overflow': 'hidden', 'font-weight':'normal', 'position':'relative'});
		$this.addClass('ui-state-default ui-th-column ui-th-ltr');			
	
		var $html = '';
		
		$html = 		'<div id="grid_wrapper" class="ui-state-default" style="width:100%; height:100%; position: relative; border:0; font-weight:normal;">'
					 + '	<div id="top_half" class="iBlk" style="float:left; width:3000px;">'
					 +	'		<div id="legend" style="float:left; position:relative;"></div>'
					 + '		<div id="top_wrapper" class="hLinkedScroll" style="float:left; overflow: hidden; border: 0;">'
					 + '			<div id="top" class="iBlk" style="float:left; position:relative;"></div>'
					 + '		</div>'
					 + '	</div>'
					 + '	<div id="bottom_half" class="iBlk" style="float:left; width:3000px;">'
					 + '		<div id="left_wrapper" class="vLinkedScroll" style="float:left; clear:both; overflow: hidden; border: 0;">'
					 + '			<div id="left" class="iBlk" style="float:left; position:relative;"></div>'
					 + '		</div>'
					 +	'		<div id="main_wrapper" class="vLinkedScroll hLinkedScroll" style="float:left; overflow:scroll; border: 0;">'
					 + '			<div id="main" class="iBlk" style="float:left; position:relative;"></div>'
					 + '		</div>'
					 + '	</div>'
					 + '	<div id="footer_wrapper" style="float: left;width: 100%; height:28px;" class="ui-widget-content ui-state-default"></div>'
					 + '</div>';
					 
		$($this).html('');
		$($html).appendTo($this);
		//$('<div id="hidden_div" style="background:white; position:absolute; top:0; left:0; width:100%; height:100%;" />').appendTo($this);
		//$('#'+$this.attr('id')+' #hidden_div').html(HTMLtoHide);
				
		getGridData($this, settings, isInit);
		
		//=================
		// Window resizing
		//=================
		
		$(window).resize(function() {
				
			var footer_height;
					
			
			if (settings.wantFooter) {
				footer_height = 28;
			} else {
				footer_height = 0;
			}			
		
			clearTimeout(resizeTimer);
			
			resizeTimer = setTimeout(function(){
						
				if (settings.noScrollbars !== false) settings.scroll_gutter = 0;		
						
				// If the parent div has no settings then expand to fit the grid				
				
				if (!settings.expandGrid) {
					$this.width($('#'+$this.attr('id')+' #main').width()+settings.scroll_gutter+2);
					$this.height($('#'+$this.attr('id')+' #top_half').height()+$('#'+$this.attr('id')+' #bottom_half').height()+settings.scroll_gutter+11);
					settings.expandGrid = true;
				}
				
				if (settings.wantAutoColWidth == 'auto') {
					fixAutoWidth($this, settings);
				}
				if (settings.wantAutoColWidth == 'full_width') {
					fixAutoFullWidth($this, settings);
				}
				
				$('#'+$this.attr('id')+' #main_wrapper').height($('#'+$this.attr('id')+' #grid_wrapper').height()-$('#'+$this.attr('id')+' #top').height()-1-footer_height);
				$('#'+$this.attr('id')+' #left_wrapper').height($('#'+$this.attr('id')+' #main_wrapper').height()-settings.scroll_gutter);			
				$('#'+$this.attr('id')+' #main_wrapper').width($('#'+$this.attr('id')+' #grid_wrapper').width()-$('#'+$this.attr('id')+' #left').width()-1);
				$('#'+$this.attr('id')+' #top_wrapper').width($('#'+$this.attr('id')+' #grid_wrapper').width()-$('#'+$this.attr('id')+' #left').width()-settings.scroll_gutter);			
								
			},10);				
		});
		
		//========================
		// Synchronise Scrollbars
		//========================
		
		$('#'+$this.attr('id')+' .hLinkedScroll').scroll(function(){
			//alert('scrollh');
			$('#'+$this.attr('id')+' .hLinkedScroll').scrollLeft($(this).scrollLeft());    
		})		
		
		$('#'+$this.attr('id')+' .vLinkedScroll').scroll(function(){
			//alert('scrollv');
			$('#'+$this.attr('id')+' .vLinkedScroll').scrollTop($(this).scrollTop());    
		})		
		
		if (isInit) {
			settings.onInitComplete();
		}	
		
		refreshAll($this, settings);
		
		if (settings.frozenCols > 0) {
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #left');
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #legend');
		} else {
			$('#'+$this.attr('id')+' #left').width(0);
			$('#'+$this.attr('id')+' #legend').width(0);
		}
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #main');
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #top');		
		
		//$('#'+$this.attr('id')+' #hidden_div').fadeOut(800);
		
	}	
	
//==========================================		
	function refreshAll($this, settings) {
//==========================================		

		//====================
		// Populate the grids
		//====================
		
		//$('#'+$this.attr('id')+' #bottom_half').css('opacity','0');
		//$('#'+$this.attr('id')+' #top_half').css('opacity','0');
		
		// Only load left panes if there are frozen columns
		
		if (settings.frozenCols > 0) {
			refreshLegend($this, settings);
			refreshLeft($this, settings);
		}

		refreshTop($this, settings);		
		refreshMain($this, settings);
		refreshFooter($this, settings);
		
		//========================
		// Grid row data bindings
		//========================
		
							
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseover', function() {
		//alert('#'+$this.attr('id')+' [rowid="'+$(this).attr('rowid') + '"]');
			if (settings.rowHoverHighlight) {$('#'+$this.attr('id')+' [rowid="'+$(this).attr('rowid') + '"]' ).addClass('ui-state-default');};
									
			settings.onMouseOver(this);						
		});
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseout', function() {			
			if (settings.rowHoverHighlight) {$('#'+$this.attr('id')+' [rowid="'+$(this).attr('rowid') + '"]' ).removeClass('ui-state-default');};
			
			settings.onMouseOut(this);
		});
		
		
		$('#'+$this.attr('id')+' .jqRGcell').bind('mousedown', function() {
			settings.onMouseDown(this);
		});
		
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseup', function() {
			settings.onMouseUp(this);
		});	
		
		$('#'+$this.attr('id')+' .jqRGdata').click(function() {
		
			if (settings.wantRowEdit) {
				if (!settings.isEditing) startEdit($this, settings, $(this).attr('rowid'), $(this).attr('rowno'));
			}
		
			settings.onDataClick(this);
		});		


		
		//================================
		// Lock grid widths to autoresize
		//================================
		
		if (settings.frozenCols > 0) {
			
			$('#'+$this.attr('id')+' #left .jqRGcol').resize(function() {
				$('#'+$this.attr('id')+' #main_wrapper').width($('#'+$this.attr('id')+' #grid_wrapper').width()-$('#'+$this.attr('id')+' #left').width()-1);
			});
		}

		settings.onLoadComplete();			
				
		$(window).resize();
						
	}
	
//==========================================	
	function startEdit($this, settings, rowid, rowNo) {
//==========================================

		settings.isEditing = true;

		for(var j=0;j<settings.colModel.length;j++){
			//alert($('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"] span').position().top + ' : ' + $('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowno="'+rowno+'"] span').position().left);
			
			if (settings.colModel[j].editable !== false) {
			
			//colWidth = Left(settings.colModel[j].width, settings.colModel[j].width.length-2);
			colWidth = $('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"]').width();
						
			$('#'+$this.attr('id')+' .jqRGdata').css('opacity','0.3');
			
			
			html = '<div class="jqRGedit" '
						+ 'colNo="' + j + '" '
						+ 'colid="' + settings.colModel[j].name + '" '
						+ 'style="'
						+ 'position:absolute; '
						+ 'left:'+$('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"]').position().left+'px; '
						+ 'top:'+($('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"]').position().top)+'px; '
						+ 'width: '+colWidth+'px; '
						+ 'background: blue;" '
						+ '><textarea wrap="off" style="overflow:hidden; font-family:verdana; font-size:8pt; opacity:1 !important; resize:none; position:absolute; top:0; left:0; width:'+(colWidth)+'px; height: 100%; padding:0;">'
						+	$('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"] span').html()
						+ '</textarea></div>';
			
			//$(html).appendTo($('#'+$this.attr('id')+' #main'));
				$(html).appendTo($('#'+$this.attr('id')+' [colid="'+settings.colModel[j].name+'"][rowid="'+rowid+'"] span').parent().parent());
			
			}
						
		}	
		
		html = '	<div class="ui-state-default ui-th-column ui-th-ltr jbutton jqRGedit" id="footer_edit_submit" style="float: left; text_align: center;">'
		html = html  + 'Submit</div>'
		html = html  + '	<div class="ui-state-default ui-th-column ui-th-ltr jbutton jqRGedit" id="footer_edit_cancel" style="float: left; text_align: center;">'
		html = html  + 'Cancel</div>';

		$(html).appendTo($('#'+$this.attr('id')+' #grid_footer'));	

		$('.jbutton').button();
		$('.jqRGFilter').attr('disabled','disabled');
		
		$('#'+$this.attr('id')+' #footer_edit_cancel').click(function() {
			$('.jqRGFilter').removeAttr('disabled');
			$('#'+$this.attr('id')+' .jqRGedit').remove();
			$('#'+$this.attr('id')+' .jqRGdata').css('opacity','1');
			
			
			settings.isEditing = false;
		});
		
		$('#'+$this.attr('id')+' #footer_edit_submit').click(function() {
		
			if (settings.source == 'local') {
																				
				$.each($('#'+$this.attr('id')+' .jqRGedit'), function(idx,obj) {
				
					// Just feed results back into the data Object
					settings.data[rowNo][$(obj).attr('colid')] = htmlEscape($('textarea',obj).val());
					
					// Update the underlying cells
					$('#'+$this.attr('id')+' [rowno="'+rowNo+'"][colid="'+$(obj).attr('colid')+'"]').html('<span class="cell_width">'+htmlEscape($('textarea',obj).val())+'</span>');
				});
			
			} else {
			
				// Remote edit feedback - a little trickier
				
				
			
			}
		
			$('.jqRGFilter').removeAttr('disabled');
			$('#'+$this.attr('id')+' .jqRGedit').remove();
			$('#'+$this.attr('id')+' .jqRGdata').css('opacity','1');
			
			isEditing = false;
		});		
	}

//==========================================	
	function htmlEscape(str) {
//==========================================
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}	

//==========================================	
	function maskGrid($this) {
//==========================================	
	
		$('<div id="div_holdspace" style="position:absolute; top:0; left:0; width:100%; height: 100%; background: blue;"></div>').appendTo($('#'+$this.attr('id')));

		$('#'+$this.attr('id') + ' #grid_wrapper').clone().prependTo($('#div_holdspace'));
		
		$('#'+$this.attr('id') + ' #div_holdspace div').attr('id','');
		
		$('#'+$this.attr('id') + ' #grid_wrapper').css('left','-10000px');	
	
	}
	
//==========================================	
	function unMaskGrid($this) {
//==========================================	
	
		$('#'+$this.attr('id') + ' #grid_wrapper').css('left','0');
		$('#'+$this.attr('id') + ' #div_holdspace').remove();
	
	}	

//==========================================
	function refreshData($this, settings) {
//==========================================

		getGridData($this, settings, 'false');
		
		//$('#'+$this.attr('id')+' #grid_wrapper').css('opacity','0');

		//====================
		// Populate the grids
		//====================
		
		// Only load left panes if there are frozen columns
		
		if (settings.frozenCols > 0) {			
			refreshLeft($this, settings);
		}
		if (settings.frozenRows > 0) {
			refreshTop($this, settings);
		}
		if (settings.frozenCols > 0 || settings.frozenRows > 0) {
			refreshLegend($this, settings);
		}
	
		refreshMain($this, settings);
		refreshFooter($this, settings);
		
		//========================
		// Grid row data bindings
		//========================
		
	
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseover', function() {

			if (settings.rowHoverHighlight) {$('#'+$this.attr('id')+' [rowid="'+$(this).attr('rowid') + '"]' ).addClass('ui-state-default');}
									
			settings.onMouseOver(this);						
		});
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseout', function() {			
			if (settings.rowHoverHighlight) {$('#'+$this.attr('id')+' [rowid="'+$(this).attr('rowid') + '"]' ).removeClass('ui-state-default');}
			
			settings.onMouseOut(this);
		});
			
		$('#'+$this.attr('id')+' .jqRGcell').bind('mousedown', function() {
			settings.onMouseDown(this);
		});
		
		$('#'+$this.attr('id')+' .jqRGcell').bind('mouseup', function() {
			settings.onMouseUp(this);
		});
		
		$('#'+$this.attr('id')+' .jqRGdata').click(function() {
		
			if (settings.wantRowEdit) {
				if (!settings.isEditing) startEdit($this, settings, $(this).attr('rowid'));
			}
		
			settings.onDataClick(this);
		});			
		
		//================================
		// Lock grid widths to autoresize
		//================================
		
		if (settings.frozenCols > 0) {
			
			$('#'+$this.attr('id')+' #left .jqRGcol').resize(function() {
				$('#'+$this.attr('id')+' #main_wrapper').width($('#'+$this.attr('id')+' #grid_wrapper').width()-$('#'+$this.attr('id')+' #left').width()-1);
			});
		}

		//settings.onLoadComplete();		
				
		$(window).resize();		
		
	}	
	
//==========================================		
	function fixAutoFullWidth($this, settings) {
//==========================================	

		var widest_width, cumulative_width, columnWidthPerc, calcWidth;
		
		var colModelWidth = 0;
		
		for(j=0;j<settings.colModel.length;j++){
			colModelWidth = colModelWidth + parseInt(Left(settings.colModel[j].width,settings.colModel[j].width.length-2));
		}
		
		for(j=0;j<settings.colModel.length;j++){
				
			columnWidth = parseInt(Left(settings.colModel[j].width,settings.colModel[j].width.length-2));
			columnWidthPerc = (100/(colModelWidth)) * columnWidth;
			
			calcWidth = ((($('#'+$this.attr('id')+' #grid_wrapper').width()-(settings.scroll_gutter)) / 100) * columnWidthPerc);
			
			//alert('colModelWidth['+colModelWidth+'], columnWidth['+columnWidth+'], calc_width['+calcWidth+']');
			
			//$('#'+$this.attr('id')+' .colID_'+settings.colModel[j].name+' .cell_width').parent().parent().width(roundNumber(calcWidth,0));	
			$('#'+$this.attr('id')+' .colID_'+settings.colModel[j].name+' .cell_width').parent().parent().width(parseInt(calcWidth));	
		
		}
	
		if (settings.frozenCols > 0) {
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #left');
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #legend');
		} else {
			$('#'+$this.attr('id')+' #left').width(0);
			$('#'+$this.attr('id')+' #legend').width(0);
		}
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #main');
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #top');

	}	

//==========================================	
	function roundNumber(num, dec) {
//==========================================
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
	}	

//==========================================		
	function fixAutoWidth($this, settings) {
//==========================================	

		var widest_width, cumulative_width;
		
		for(j=0;j<settings.colModel.length;j++){
		
			widest_width = 0;
			
			//alert('#'+$this.attr('id')+' .colID_'+settings.colModel[j].name+' .cell_width');
			
			$.each($('#'+$this.attr('id')+' .colID_'+settings.colModel[j].name+' .cell_width'), function(idx, obj) {
				//alert($(obj).width() + ' : ' + widest_width);
				if ($(obj).width() > widest_width) widest_width = $(obj).width();
			});
			
			$('#'+$this.attr('id')+' .colID_'+settings.colModel[j].name+' .cell_width').parent().parent().width(widest_width+12);	
			
			//alert('processing '+j+' : '+settings.colModel[j].name + ' : ' + widest_width);
		
		}
	
		if (settings.frozenCols > 0) {
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #left');
			fixAutoWidthGridSizes('#'+$this.attr('id')+' #legend');
		} else {
			$('#'+$this.attr('id')+' #left').width(0);
			$('#'+$this.attr('id')+' #legend').width(0);
		}
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #main');
		fixAutoWidthGridSizes('#'+$this.attr('id')+' #top');
		
		

	}

//==========================================	
	function fixAutoWidthGridSizes(gridName){
//==========================================
	
		var cumWidth = 0;
		
		$.each($(gridName + ' .jqRGcol'), function(idx, obj) {
			
			//=============================================
			// Add cumulative widths excluding hidden cols
			//=============================================
			
			if ($(obj).css('display') != 'none') {
				cumWidth = cumWidth + $(obj).width();
			}
		});
		//alert(cumWidth);
		$(gridName).width(parseInt(cumWidth)+2);	
	}
	
//==========================================	
	function refreshLegend($this, settings) {
//==========================================	
			
		addColumns($this, '#'+$this.attr('id')+' #legend', settings, true, true, true, true, true);
		
	}
	
//==========================================	
	function refreshTop($this, settings) {
//==========================================		
	
		addColumns($this, '#'+$this.attr('id')+' #top', settings, false, true, true, true, true);
		
		//==================================
		// Filter Bindings
		//==================================
		
		if (settings.wantFilter) {
			$('.jqRGFilter').bind('propertychange input paste', function() {
				
				//==================================
				// Stagger firing the refresh to allow user to finish typing a word
				//==================================
				
				clearTimeout(filtTimer);
				
				filtTimer = setTimeout(function(){			
					refreshData($this, settings);
				},settings.filterFiringDuration);
			});
		}		
		
	}	
	
//==========================================	
	function refreshLeft($this, settings) {
//==========================================		
	
		addColumns($this, '#'+$this.attr('id')+' #left', settings, true, false, false, false, true);
	
		//fixAutoWidth('#'+$this.attr('id')+' #left');
		//fixAutoWidth('#'+$this.attr('id')+' #legend');
	
	}	

//==========================================	
	function refreshMain($this, settings) {
//==========================================		
	
		addColumns($this, '#'+$this.attr('id')+' #main', settings, false, false, false, false, true);
		
		//fixAutoWidth('#'+$this.attr('id')+' #main');
		//fixAutoWidth('#'+$this.attr('id')+' #top');
			
	}	

//==========================================	
	function refreshFooter($this, settings) {
//==========================================		

		//==================================
		// Put grid related data into nicer named vars
		//==================================
		
		var grid_records;
		var grid_shown_record_count = 0;
		var grid_page;
		var grid_total;
		
		//alert(JSON.stringify(settings.data));
		
		if (settings.source == 'remote') {
			grid_page = settings.data[0].page;
			grid_total = settings.data[0].total;
			grid_records = settings.data[0].records;
		} else {
			grid_page = 1;
			grid_total = 1;
			grid_records = settings.data.length;
		}
				
		addFooter($this, grid_page, grid_total, grid_records, grid_shown_record_count, settings);
		
	}

//==========================================	
	function addColumns($this, thisDiv, settings, isFrozenCols, isFrozenRows, withHeader, withFilter, withData) {
//==========================================	

		var gridWidth = 0;
		var widest_width = 0;
		
		// Clear down the div first
		$(thisDiv).html('');
		
		for(j=0;j<settings.colModel.length;j++){

			if (
					(isFrozenCols && j <= (settings.frozenCols-1)) || (!isFrozenCols && j > (settings.frozenCols-1))
				) {
				
				addColumn(thisDiv, settings, j, isFrozenRows, withHeader, withFilter, withData);
				
			}
		};			
				
		//=====================
		// Col Header Bindings
		//=====================
				
		$('#'+$this.attr('id')+' .jqRGheader').unbind('click');
		$('#'+$this.attr('id')+' .jqRGheader').click(function() {
		
			//alert('clicked ' + $(this).attr('colid'));
			
			if ($(this).attr('sort') == 'true') {

				//========================================================
				// If the column is already selected then toggle the order
				//========================================================
										
				if (settings.sidx == $(this).attr('colid')) {
					
					if (settings.sord == 'ASC') {
						settings.sord = 'DESC';															
					} else {
						settings.sord = 'ASC';	
					}
					
				} else {
				
					settings.sord = 'ASC';
					//alert('setting sidx to [' + $(this).attr('colid')+']');
					settings.sidx = $(this).attr('colid');	
					
				}
				
				//alert(settings.colModel[$(this).attr('colno')].fieldType);
				if (settings.source == 'local') {
				
					switch (settings.colModel[$(this).attr('colno')].fieldType)
					{
						case 'int':									
							if (settings.sord == 'ASC') {
								settings.data.sort(function(a,b) {							
									return parseFloat(a[settings.sidx].replace(',',''))-parseFloat(b[settings.sidx].replace(',',''))
								});													
							} else {			
								settings.data.sort(function(a,b) {							
									return parseFloat(b[settings.sidx].replace(',',''))-parseFloat(a[settings.sidx].replace(',',''))
								});																			
							}
							
							break;
							
						case 'date':									
							if (settings.sord == 'ASC') {
								settings.data.sort(function(a,b) {
									if (settings.dateFormat == 'dd/mm/yyyy') var dateA=new Date(a[settings.sidx].split("/")[2], a[settings.sidx].split("/")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);
									if (settings.dateFormat == 'dd-mm-yyyy') var dateA=new Date(a[settings.sidx].split("-")[2], a[settings.sidx].split("-")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);
									return dateA-dateB //sort by date ascending
								});													
							} else {			
								settings.data.sort(function(a,b) {							
									if (settings.dateFormat == 'dd/mm/yyyy') var dateA=new Date(a[settings.sidx].split("/")[2], a[settings.sidx].split("/")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);var dateA=new Date(a[settings.sidx].split("/")[2], a[settings.sidx].split("/")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);
									if (settings.dateFormat == 'dd-mm-yyyy') var dateA=new Date(a[settings.sidx].split("-")[2], a[settings.sidx].split("-")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);var dateA=new Date(a[settings.sidx].split("/")[2], a[settings.sidx].split("/")[1] - 1, a[settings.sidx].split("/")[0]), dateB=new Date(b[settings.sidx].split("/")[2], b[settings.sidx].split("/")[1] - 1, b[settings.sidx].split("/")[0]);
									return dateB-dateA //sort by date ascending
								});																			
							}
							
							break;							
					
						default :
						
							if (settings.sord == 'ASC') {
										
								settings.data.sort(function(a,b) {
								
									var nameA=a[settings.sidx].toLowerCase(), nameB=b[settings.sidx].toLowerCase()
									
									if (nameA < nameB) //sort string ascending
										return -1 
									if (nameA > nameB)
										return 1
									return 0 //default return value (no sorting)				
								});
							} else {
								settings.data.sort(function(a,b) {
								
									var nameA=a[settings.sidx].toLowerCase(), nameB=b[settings.sidx].toLowerCase()
									
									if (nameB < nameA) //sort string ascending
										return -1 
									if (nameB > nameA)
										return 1
									return 0 //default return value (no sorting)				
								});
							
							}
					}
				} else {
					// Refresh reordered remote data
					getGridData($this, settings, false);
				}
				refreshAll($this, settings);
									
				settings.onSortOrderChange($(this).attr('colid'), settings.sord);
				
			}
			
		});
		
		$('#'+$this.attr('id')+' .jqRGheader ').attr('onMouseOver',"this.style.cursor='pointer'");
				
	}

//==========================================	
	function addColumn(obj, settings, colNo, isFrozenRows, withHeader, withFilter, withData) {
//==========================================	
	
		var tmpHTML, col_Display, col_header_title, cell_align, rounded_title, cell_data, cell_title, id_field, cur_group_field, widest_width;
		
		//==================================
		// If not hidden
		//==================================
		
		
		if (settings.colModel[colNo].hidden) {
			col_Display = 'none';
		} else {
			col_Display = 'inline';
		}		
		
		if (settings.wantRoundedHeaders) {
			rounded_title = 'ui-corner-top';
		} else {
			rounded_title = '';
		}	
		
		if (!settings.colModel[colNo].custom_title) {
			col_header_title = settings.colNames[colNo];
		} else {
			col_header_title = settings.colModel[colNo].custom_title;
		}		

		//==================================					
		// Handle cell alignment defaults
		//==================================
								
		if (settings.colModel[colNo].align) {
			cell_align = settings.colModel[colNo].align;
		} else {
			cell_align = 'center';
		}		
		
		//==================================
		// Column wrapper - to keep it all nice and straight
		//==================================
		
		tmpHTML = '<div colNo="'+colNo+'" colID="'+settings.colModel[colNo].name+'" class="jqRGcol" style="float:left; display:'+col_Display+'; width:'+settings.colModel[colNo].width+';">';
		
		//=======================================================================================
		// Header
		//=======================================================================================
		
		if (withHeader) {
		
			tmpHTML = tmpHTML   + '<div '
															+ 'style="width:100%; text-align:center; position: relative; overflow:hidden; " '
															+ 'class="jqRGcell jqRGheader ui-widget-header colNo_'+colNo+' colID_'+settings.colModel[colNo].name+' '+rounded_title+'" '
															+ 'colNo="'+colNo+'" '
															+ 'colID="'+settings.colModel[colNo].name+'" ';
															
			if (settings.colModel[colNo].sort !== false && settings.sortable !== false) {												
								tmpHTML = tmpHTML   + 'sort="true" ';
			};		
			
								tmpHTML = tmpHTML   + '>'
														+ '<span class="cell_width">'+col_header_title+'</span>';
																													
			if (settings.sidx == settings.colModel[colNo].name && settings.colModel[colNo].sort !== false && settings.sortable == true) {
			
				//alert('settings.sidx['+settings.sidx+'], settings.colModel[colNo].name['+settings.colModel[colNo].name+'], settings.colModel[colNo].sort['+settings.colModel[colNo].sort+'], settings.sortable['+settings.sortable+']');			
			
				if (settings.sord == 'DESC') {							
							tmpHTML = tmpHTML + '<div class="ui-state-highlight" style="border:0;"><span style="position:absolute;left:-4px;top:4px;" class="ui-icon ui-icon-light ui-icon-triangle-1-s"></span></div>';
				} else {			
							tmpHTML = tmpHTML	+ '<div class="ui-state-highlight" style="border:0;"><span style="position:absolute;left:-4px;top:-5px; display:'+col_Display+';" class="ui-icon ui-icon-light ui-icon-triangle-1-n"></span></div>';
				};
			};
			
							tmpHTML = tmpHTML	+ '</div>';
		}
		
		//=======================================================================================
		// Filter
		//=======================================================================================

		if (withFilter && settings.wantFilter) {
			
			if (settings.colModel[colNo].filter == false){
			
				tmpHTML = tmpHTML + '<div class="jqRGcell jqRGfilter ui-widget-content" style="display:block; overflow:hidden; width:100%;"></div>';						
				
			} else {			
			
				if (settings.colModel[colNo].type == 'date') {
				
					tmpHTML = tmpHTML + '<div class="jqRGcell jqRGfilter ui-widget-content" style="display:block; overflow:hidden; width:100%;"><textarea type="text" id="flt_'+settings.colModel[colNo].name+'" colID="'+settings.colModel[colNo].name+'" colNo="'+colNo+'" class="jDate jqRGFilter ui-state-default" wrap="off" style="overflow:hidden; font-family:verdana; font-size:8pt; resize:none; "></textarea></div>';									
				
				} else {
					
					tmpHTML = tmpHTML + '<div class="jqRGcell jqRGfilter ui-widget-content" style="display:block; overflow:hidden; width:100%;"><textarea type="text" id="flt_'+settings.colModel[colNo].name+'" colID="'+settings.colModel[colNo].name+'" colNo="'+colNo+'" class="jqRGFilter data ui-state-default" wrap="off" style="overflow:hidden; font-family:verdana; font-size:8pt; resize:none;padding:0; ">'
					
					if (settings.filteredFields.length > 0) {
						tmpHTML = tmpHTML + settings.filteredFields[colNo].data;
					}
					
					tmpHTML = tmpHTML + '</textarea></div>';			
				
				}		
			}
		}
			
		
		cur_group_field = '';
		widest_width = 0;
		
		//=======================================================================================		
		// Data
		//=======================================================================================
		
		$.each(settings.data, function(i,v) {

			//==================================
			// Is this a custom defined field or a table field?
			//==================================
			
			if (!settings.colModel[colNo].custom) {
				cell_data = v[settings.colModel[colNo].name];
				cell_title = cell_data;
			} else {
				cell_data = settings.colModel[colNo].custom;
				cell_title = settings.colModel[colNo].custom_title;
			}
			
			//======================
			// Overridable id field
			//======================
			
			if (settings.idField == '') {
				id_field = settings.data[i][settings.colModel[0].name];
			} else {
				id_field = settings.data[i][settings.idField];				
			}
			
			//======================
			// Handle nulls
			//======================
			
			if (!cell_data && cell_data != 0) {
				if (settings.hideNull == true) {
					cell_data = '';		
				} else {
					cell_data = '<span style="opacity:0.1;font-style:italic;font-size:xx-small;">NULL</span>';
				}
			}	

			//======================
			//	Group Headers
			//======================
			
			if (settings.grouped 
					&& !withHeader 					
					&& cur_group_field !== v[settings.grouped_on]) {
					
				if (colNo == 0) {
				
					tmpHTML = tmpHTML + '<div '
											+ '		class="jqRGcell ui-state-default rowNo_'+i+' colNo_'+colNo+' rowID_'+settings.data[i][settings.colModel[0].name]+' colID_'+settings.colModel[colNo].name+'" '										
											+ '		colNo="'+colNo+'" '
											+ '		colID="'+settings.colModel[colNo].name+'">'
											+ v[settings.grouped_on]
											+ '</div>';
				} else {

					tmpHTML = tmpHTML + '<div '
											+ '		class="jqRGcell ui-state-default rowNo_'+i+' colNo_'+colNo+' rowID_'+settings.data[i][settings.colModel[0].name]+' colID_'+settings.colModel[colNo].name+'" '										
											+ '		colNo="'+colNo+'" '
											+ '		colID="'+settings.colModel[colNo].name+'">'											
											+ '</div>';
				
				}
										
				cur_group_field = v[settings.grouped_on];
			}			

			//============================
			// Inject normal cells
			//============================
			
			var backgroundClass = "ui-widget-content";
			if (((isFrozenRows && i < settings.frozenRows) || (settings.frozenCols > colNo)) && settings.wantFrozenHighlight) backgroundClass = "ui-state-highlight ui-widget-content";
			
			if ((isFrozenRows && i < settings.frozenRows) || (!isFrozenRows && i >= settings.frozenRows)) {
		
				tmpHTML = tmpHTML + '<div '
										+ '		class="jqRGcell jqRGdata '+backgroundClass+' rowNo_'+i+' colNo_'+colNo+' rowID_'+settings.data[i][settings.colModel[0].name]+' colID_'+settings.colModel[colNo].name+'" '
										+ '		title="'+cell_title+'" '
										+ '		style="'
															+ 'width: 100%; '
															+ 'text-align:'+cell_align+'; '
															+ 'border-top-width: 0px; '															
															+ 'overflow:hidden; '
										+ '		rowNo="'+i+'" '
										+ '		rowID="'+id_field+'" '
										+ '		colNo="'+colNo+'" '
										+ '		colID="'+settings.colModel[colNo].name+'">'
										+ '<span class="cell_width" ';
										
								/*if (cell_align == 'left') {
									tmpHTML = tmpHTML + ' style="padding-left:2px;"';
								}*/										
										
								tmpHTML = tmpHTML + '>'
										
										+ cell_data
										+'</span>'
										+ '</div>';
			
			}
			
		});
		
		tmpHTML = tmpHTML + '</div>';
		
		$(tmpHTML).appendTo(obj);		
					
	}
	
//==========================================		
	function filterField(fieldName,data){
//==========================================		
		this.fieldName = fieldName;
		this.data = data;		
	}
	
//==========================================	
	function getGridData($this, settings, isInit) {
//==========================================

		try {

			settings.beforeLoad($this, settings);
	  
			//==================================
			// Determine source type, ie JSON object or JSON from DB
			//==================================
			
			if (settings.source == 'remote') {

				//==================================
				// Add random field to URL to prevent ajax caching
				//==================================
				
				var d = new Date().getTime();
				
				settings.where = encodeURIComponent(processFiltersForURL($this, settings));
				
				var grid_URL = settings.url + '&page=' + settings.page + '&limit=' + settings.limit + '&sord=' + settings.sord + '&sidx=' + settings.sidx + '&where=' + settings.where + '&curtime=' + d;

				//==================================
				// Go get the data from the database
				//==================================
				
				$.ajaxSetup( { "async": false } );			
				
				$.getJSON(grid_URL, function(data) {
								
					settings.data = data;					
									
				}).error(function(jqXHR, textStatus, errorThrown) {
					console.log("error " + textStatus);
					console.log("incoming Text " + jqXHR.responseText);
				})
								
				$.ajaxSetup( { "async": true } );
			
			} else {		
				
				//===============================
				// Apply filtering to local data
				//===============================
				
				// Keep a copy of the original
				if (settings.master_data.length == 0) settings.master_data = settings.data;
				
				// Store the filter entries
				settings.filteredFields = [];
				
				$.each($('#'+$this.attr('id')+' .jqRGfilter textarea'), function(idx,obj) {	
					settings.filteredFields.push(new filterField($(obj).attr('colID'),$(obj).val()));
				});
				
				settings.data = settings.master_data.filter(function (el) {
				
					//alert(JSON.stringify(el));
				
					var result = true;
				
					$.each($('#'+$this.attr('id')+' .jqRGfilter textarea'), function(idx,obj) {									
				
						if ($(obj).val()) {										

							if (el[$(obj).attr('colID')].indexOf($(obj).val()) < 0) result = false;													
					
						}	
					});
					
					return result;				
				});			
			}		
		}
		catch(e){
			alert('[loadGrid] Error:'+e.message);
		}			
		
	}
	
//==========================================
	function processFiltersForURL($this, settings) {
//==========================================

	try {
	
			var isFirst = false;  // should be true, but we want a preceeding AND
			var tmpStr = '';
			
			$.each($('#'+$this.attr('id')+' .jqRGfilter textarea'), function(idx,obj) {
			
				if ($(obj).val()) {
			
					if (!isFirst) tmpStr = tmpStr + ' AND ';
				
					tmpStr = tmpStr + $(obj).attr('colID') + " LIKE '%" + $(obj).val() + "%'";
					
					isFirst = false;
			
				}	
			});
			
			return tmpStr;		
		
		}
		catch(e){
			alert('[processFiltersForURL] Error:'+e.message);
		}	
		
	}	
	
	
//==========================================
	function addFooter($this, grid_page, grid_total, grid_records, grid_shown_record_count, settings) {
//==========================================
	
		try {
			var thisHtml = '';
					
			if (settings.wantFooter) {
			
				thisHtml = thisHtml  + '<div id="grid_footer" style="height:28px">';
				
				//==================================
				// Refresh button
				//==================================

				if (settings.wantFooterRefresh) {
					thisHtml = thisHtml  + '	<div class="ui-state-default ui-th-column ui-th-ltr" id="footer_refresh" style="float:left;text_align:center;width:16px;height:28px;padding-top:4px;">'
												+ '		<span class="ui-icon ui-icon-refresh" title="Refresh"></span></div>';			
				}
				
				//==================================
				// Hide Navigator if only one page
				//==================================
				
				if (grid_total > 1) {
				
					thisHtml = thisHtml  + '	<div class="ui-state-default ui-th-column ui-th-ltr" id="footer_middle_div" style="float:left;text_align:center;">'
												+ '		<div style="width:40px; float:left; padding-top:4px;">';
					
					if (grid_page > 1) {
					
						thisHtml = thisHtml  + '		<span style="float:left;" id="page_first" class="ui-icon ui-icon-seek-first"></span><span style="float:left;" id="page_down" class="ui-icon ui-icon-seek-prev"></span>';
						
					} else {
					
						thisHtml = thisHtml  + '		<span style="float:left; opacity:0.3;" class="ui-icon ui-icon-seek-first"></span><span style="float:left; opacity: 0.3;" class="ui-icon ui-icon-seek-prev"></span>';
						
					}
					
					thisHtml = thisHtml  + '		</div><span style="float:center;">Page <input type="text" id="page_no" style="width:20px; text-align:right;" value="'+grid_page+'" /> of '+grid_total+'</span><div style="width:40px; float:right; padding-top:4px;">';
					
					if (grid_page !== grid_total) {
						
						thisHtml = thisHtml  + '		<span style="float:left" id="page_up" class="ui-icon ui-icon-seek-next"></span><span style="float:left;" id="page_last" class="ui-icon ui-icon-seek-end"></span>';
						
					} else {
					
						thisHtml = thisHtml  + '		<span style="float:left; opacity: 0.3" class="ui-icon ui-icon-seek-next"></span><span style="float:left; opacity: 0.3;" class="ui-icon ui-icon-seek-end"></span>';
						
					}
							
					thisHtml = thisHtml  + '	</div></div>';
					
				}
				
				if (!grid_records) grid_records = settings.frozenRows;
				
				//alert(settings.data.length);
				
				thisHtml = thisHtml  + '	<span id="footer_text" style="float:right; height:28px; padding-right:4px; padding-top: 6px;">[Showing '+(((settings.page-1)*settings.limit)+1)+'-'+(((settings.page-1)*settings.limit)+settings.data.length)+' of '+grid_records+']</span>'
											+ '</div>';
			//}
			
				$('#footer_wrapper',$this).html(thisHtml);
				
				//=========================================================================================
				
				
				//=====================
				// Footer Bindings
				//=====================
				
				// Resize width
				
				$('#'+$this.attr('id')+' #footer_refresh').click(function() {
					refreshData($this, settings);
				});
							
				$('#'+$this.attr('id')+' #page_down').click(function() {
					setPageNumber(settings.page - 1, $this, settings);
					settings.onPageDown($this);
				})
				
				$('#'+$this.attr('id')+' #page_up').click(function() {
					setPageNumber(settings.page + 1, $this, settings);
					settings.onPageUp($this);
				})		

				$('#'+$this.attr('id')+' #page_first').click(function() {
					setPageNumber(1, $this, settings);
					settings.onPageFirst($this);
				})
				
				$('#'+$this.attr('id')+' #page_last').click(function() {
					setPageNumber(grid_total, $this, settings);
					settings.onPageLast($this);
				})		

				$('#'+$this.attr('id')+' #page_no').keydown(function(event) {
					if (event.which == 13 || event.keyCode == 9) {
					
						if (parseInt($(this).val()) > grid_total) $(this).val(grid_total);
		
						setPageNumber(parseInt($(this).val()), $this, settings);
					}			
				
					//==================================
					// Allow: backspace, delete, tab, escape, and enter
					//==================================
					
					if ( event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 || 
						
						//==================================
						// Allow: Ctrl+A
						//==================================
						
						(event.keyCode == 65 && event.ctrlKey === true) || 
						
						//==================================
						// Allow: home, end, left, right
						//==================================
						
						(event.keyCode >= 35 && event.keyCode <= 39)) {

							//==================================
							// let it happen, don't do anything
							//==================================
							
							return;
					}
					else {
						//==================================
						// Ensure that it is a number and stop the keypress
						//==================================
						
						if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
							 event.preventDefault(); 
						}   
					}		
				});	// End of Key Down	
			} // End of If Want Footer	
			
		}
		catch(e){
			alert('[addFooter] Error:'+e.message);
		}			
	} // End of Footer Section	
	
//==========================================	
	function setPageNumber(newPageNo, $this, settings) {
//==========================================	

	try {
	
			settings.page = newPageNo;
			
			$('#'+$this.attr('id')+' #footer_text').html('Loading');
			
			//refreshData($this, settings);	
			
			loadGrid($this, settings, false);

		}
		catch(e){
			alert('[addFooter] Error:'+e.message);
		}		
	
	}	
			

//=========================================================================================================================
  
  $.fn.razorGrid = function( method ) {
  
    if ( methods[method] ) {
      return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.razorGrid' );
    }     
  };
  
//=========================================================================================================================  

})( jQuery );