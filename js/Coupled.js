/*global createjs, $, Square, Port, Line, relaxed_khan */
/*exported Coupled */

"use strict";
function Coupled(parameters) {
    /*jshint validthis:true */
    this.initialize(parameters);
}

Coupled.prototype = new createjs.Container();
Coupled.prototype.ContainerInitialize = Coupled.prototype.initialize;
Coupled.prototype.ContainerTick = Coupled.prototype._tick;

Coupled.prototype.initialize = function(parameters) {
    this.ContainerInitialize();


    /********** Coupled structure ************/
    this.is_top = false;
    this.is_expanded = false;
    this.structure = $.extend(true, {}, Coupled.empty_structure);

    /******* graphical components **********/
    this.ports = {in: [], out: []};
    this.models = [];
    this.ic = [];
    this.eoc = [];
    this.eic = [];

    /********** Default values **************/
    this.textColor = "#000000";
    this.radius_percentage = 0.05;

    $.extend(true, this, parameters);

    if (this.is_top) {
        this.width = this.canvas.stageWidth * 0.9;
        this.height = this.canvas.stageHeight * 0.9;
        this.x = (this.canvas.stageWidth - this.width) / 2;
        this.y = (this.canvas.stageHeight - this.height) / 2;
    }

    this.draw_coupled();

    this.addEventListener("dblclick", this.toggle.bind(this));
};

Coupled.empty_structure = {
    type: "",
    models: [],
    ic: [],
    ports: {in: [], out: []},
    eoc: [],
    eic: [],
};

Coupled.prototype.draw_coupled = function() {
    this.model_box = new Square({
        canvas: this.canvas,
        width: this.width,
        height: this.height,
        radius: this.width * this.radius_percentage
    });

    this.addChild(this.model_box);
    this.draw_name();
    this.draw_ports();

    this.canvas.stage.update();
};

Coupled.prototype.draw_name = function() {

    var text_style = Math.floor(this.width * 0.08).toString() + "px Arial";
    this.name = new createjs.Text(this.id, text_style, this.textColor);
    this.name.textBaseline = "top";
    this.name.y = 2;
    this.name.x = this.width / 2;
    this.name.regX = this.name.getBounds().width / 2;
    this.addChild(this.name);

    this.canvas.stage.update();
};

Coupled.prototype.draw_ports = function() {
    
    this.clean(this.ports.in);
    this.clean(this.ports.out);

    this.add_ports(this.structure.ports.in, this.ports.in, 0, Port.in);
    this.add_ports(this.structure.ports.out, this.ports.out, this.width, Port.out);

    this.canvas.stage.update();
};

Coupled.prototype.add_ports = function(structure_ports, graphical_ports, x, outin) {
    var i, height, width, port, margin;

    this.clean(graphical_ports);

    height = (this.height * 0.9 / structure_ports.length) - 1;
    height = Math.min(height, Math.floor(this.height * 0.1));
    width = height;

    margin = (this.height * 0.9 / structure_ports.length) - height;

    for(i = 0; i < structure_ports.length; ++i) {
        port = new Port({
            canvas: this.canvas,
            outin: outin,
            fillColor: "#0000",
            width: width,
            height: height,
            id: structure_ports[i],
            font_size: height * 0.4
        });

        port.x = x;
        port.y = this.height * 0.05 + (margin / 2) + i * (height + margin);
        graphical_ports.push(port);
        this.addChild(port);
    }
};

Coupled.prototype.calculate_submodel_positions = function() {
    var graph, models, ic, i, j, node;

    graph = [];
    models = this.structure.models;
    ic = this.structure.ic;
    for(i = 0; i < models.length; i++) {
        node = {model: models[i].id, neighbors: []};
        for(j = 0; j < ic.length; j++) {
            if (ic[j].from_model === node.model) {
                node.neighbors.push(ic[j].to_model);
            }
        }
        graph.push(node);
    }

    return relaxed_khan(graph);
};

Coupled.prototype.clean = function(models) {
    while (models.length > 0) {
        this.removeChild(models[0]);
        models.splice(0,1);
    }
};

Coupled.prototype.expand = function() {

    if (this.structure.models.length === 0 || this.is_expanded) { return; }

    var modelsByColumns, highestColum, modelsWidth, modelsHeight, i, j, x;
    var model, columnMoldes, modelStructure;

    this.clean(this.models);

    modelsByColumns = this.calculate_submodel_positions();

    highestColum = modelsByColumns[0].length;
    for(i = 1; i < modelsByColumns.length; i++) {
        if (modelsByColumns[i].length > highestColum) {
            highestColum = modelsByColumns[i].length;
        }
    }

    // Model witdh as the models margin -> columns * 2
    modelsWidth = Math.floor(this.width * 0.85 / (modelsByColumns.length * 2));
    modelsHeight = Math.floor(this.height * 0.85 / (highestColum * 2));

    for (j = 0; j < modelsByColumns.length; j++) {
        columnMoldes = modelsByColumns[j];
        x = this.width * 0.075 + modelsWidth / 2 + j * modelsWidth * 2;
        for (i = 0; i < columnMoldes.length; i++) {

            modelStructure = this.get_model(columnMoldes[i]);
            model = new Coupled({
                canvas: this.canvas,
                id: modelStructure.id,
                width: modelsWidth,
                height: modelsHeight,
                structure: $.extend(true, {}, modelStructure) 
            });
            model.x = x;
            model.y = this.height * 0.075 + modelsHeight / 2 + i * modelsHeight * 2;
            this.addChild(model);
            this.models.push(model);
        }
    }


    this.draw_links();

    this.canvas.stage.update();
    this.is_expanded = true;
};

Coupled.prototype.draw_links = function() {
    this.draw_ic();
    this.draw_eic();
    this.draw_eoc();
};

Coupled.prototype.draw_ic = function() {
    var port_in, port_out, ic, i;
    this.clean(this.ic);

    for (i = 0; i < this.structure.ic.length; i++) {
        ic = this.structure.ic[i];

        port_out = this.getPort(ic.from_model, ic.from_port, Port.out);
        port_in = this.getPort(ic.to_model, ic.to_port, Port.in);
        
        this.ic.push(this.connect(port_out, port_in));
    }

    this.canvas.stage.update();
};

Coupled.prototype.draw_eic = function() {
    var port_in, port_out, eic, i;
    this.clean(this.eic);

    for (i = 0; i < this.structure.eic.length; i++) {
        eic = this.structure.eic[i];

        port_out = this.getPort(this.id, eic.external_in_port, Port.in);
        port_in = this.getPort(eic.to, eic.in_port, Port.in);
        
        this.eic.push(this.connect(port_out, port_in));
    }

    this.canvas.stage.update();
};

Coupled.prototype.draw_eoc = function() {
    var port_in, port_out, eoc, i;
    this.clean(this.eoc);

    for (i = 0; i < this.structure.eoc.length; i++) {
        eoc = this.structure.eoc[i];

        port_out = this.getPort(eoc.from, eoc.out_port, Port.out);
        port_in = this.getPort(this.id, eoc.external_out_port, Port.out);
        
        this.eoc.push(this.connect(port_out, port_in));
    }

    this.canvas.stage.update();
};

Coupled.prototype.connect = function(port_out, port_in) {
    var start_point, end_point, line;
    start_point = port_out.parent.localToLocal( port_out.x - port_out.regX,
                                                port_out.y - port_out.regY + port_out.height / 2,
                                                this);
    end_point = port_in.parent.localToLocal(port_in.x - port_in.regX,
                                            port_in.y - port_in.regY + port_in.height / 2,
                                            this);
    line = new Line({
        canvas: this.canvas,
        nodes: [start_point, end_point],
        color: "#000000",
        width: 2,
    });

    this.addChild(line);
    return line;
};

Coupled.prototype.getPort = function(model_id, port_id, inout) {
    var model, ports, i;

    model = this.getModel(model_id);

    if (inout == Port.in) {
        ports = model.ports.in;
    } else {
        ports = model.ports.out;
    }

    for (i = 0; i < ports.length; i++) {
        if (ports[i].id === port_id) {
            return ports[i];
        }
    }
};

Coupled.prototype.getModel = function(model_id) {
    var i;

    if (model_id === this.id) {
        return this;
    }

    for (i = 0; i < this.models.length; i++) {
        if (this.models[i].id === model_id) {
            return this.models[i];
        }
    }  
};

Coupled.prototype.get_model = function(id) {
    for (var i = 0; i < this.structure.models.length; i++) {
        if (this.structure.models[i].id == id) {
            return this.structure.models[i];
        }
    }
};

Coupled.prototype.contract = function() {
    
    this.clean(this.models);
    this.clean(this.eic);
    this.clean(this.eoc);
    this.clean(this.ic);
    this.canvas.stage.update();

    this.is_expanded = false;
};

Coupled.prototype.toggle = function(evt) {
    console.log("ID: ", this.id);
    evt.stopImmediatePropagation();

    if (this.is_expanded) {
        this.contract();
    } else {
        this.expand();
    }

    return false;
};

Coupled.prototype.expandInNewCanvas = function() {};

Coupled.prototype.destroy = function() {
    if (!this.is_top) { return; }
};