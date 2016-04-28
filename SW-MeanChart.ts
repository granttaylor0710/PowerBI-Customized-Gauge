module powerbi.visuals {
    import SelectionManager = utility.SelectionManager;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    export interface BoxWhiskerChartConstructorOptions {
        svg?: D3.Selection;
        margin?: IMargin;
    }

    export interface BoxWhiskerChartDatapoint {
        min: number;
        max: number;
        median: number;
        quartile1: number;
        quartile3: number;
        average: number;
        samples: number;
        category: number;
        color?: string;
        label?: string;
        outliers: number[];
        dataLabels: BoxWhiskerDataLabel[];
        identity: SelectionId;
        tooltipInfo?: TooltipDataItem[];
    }

    export interface BoxWhiskerChartData {
        dataPoints: BoxWhiskerChartDatapoint[][];
        legendData: LegendData;
    }

    export interface BoxWhiskerDataLabel {
        value: number;
        y: number;
        x: number;
    }

    export interface BoxWhiskerAxisOptions {
        max: number;
        min: number;
        ticks: number;
        tickSize: number;
    }

    export module BoxWhiskerTypeOptions {
        export enum ChartType {
            MinMax,
            Standard,
            IQR
        }
    }

    export class BoxWhiskerChart implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Groups',
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: 'Groups'
                },
                {
                    name: 'Samples',
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: 'Samples'
                },
                {
                    name: 'Values',
                    kind: powerbi.VisualDataRoleKind.Measure,
                    displayName: 'Values'
                },
            ],
            dataViewMappings: [{
                conditions: [
                    { 'Groups': { max: 1 }, 'Values': { min: 0, max: 1 } }
                ],
                categorical: {
                    categories: {
                        for: { in: 'Samples' }
                    },
                    values: {
                        group: {
                            by: 'Groups',
                            select: [{ for: { in: 'Values' } }]
                        }
                    }
                }
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                chartOptions: {
                    displayName: "Chart Options",
                    properties: {
                        whisker: {
                            displayName: "Chart type",
                            description: "Determines the type of box and whisker chart",
                            type: {
                                enumeration: createEnumType([
                                    { value: BoxWhiskerTypeOptions.ChartType.MinMax, displayName: "Min/Max" },
                                    { value: BoxWhiskerTypeOptions.ChartType.Standard, displayName: "Tukey" },
                                    { value: BoxWhiskerTypeOptions.ChartType.IQR, displayName: "1.5 IQR" }
                                ])
                            }
                        },
                        outliers: {
                            displayName: "Outliers",
                            description: "Show outliers",
                            type: { bool: true }
                        }
                    }
                },
                dataPoint: {
                    displayName: "Data colors",
                    properties: {
                        fill: {
                            displayName: "Fill",
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                gridLines: {
                    displayName: "Gridlines",
                    properties: {
                        majorGrid: {
                            displayName: "Major grid",
                            description: "Display major gridlines",
                            type: { bool: true }
                        },
                        minorGrid: {
                            displayName: "Minor grid",
                            description: "Display minor gridlines",
                            type: { bool: true }
                        }
                    }
                },
                labels: {
                    displayName: "Data labels",
                    properties: {
                        show: {
                            displayName: "Show",
                            type: { bool: true }
                        }
                    }
                },
                legend: {
                    displayName: "Legend",
                    properties: {
                        show: {
                            displayName: "Show",
                            description: "Show legend",
                            type: { bool: true }
                        },
                        showTitle: {
                            displayName: "Title",
                            description: "Display a title for legend symbols",
                            type: { bool: true }
                        },
                        titleText: {
                            displayName: "Legend Name",
                            description: "Title text",
                            type: { text: true }
                        }
                    }
                }
            }
        };

        private static properties = {
            formatString: { objectName: "general", propertyName: "formatString" },
            whiskerType: { objectName: "chartOptions", propertyName: "whisker" },
            showOutliers: { objectName: "chartOptions", propertyName: "outliers" },
            showMajorGridLines: { objectName: "gridLines", propertyName: "majorGrid" },
            showMinorGridLines: { objectName: "gridLines", propertyName: "minorGrid" },
            fill: { objectName: "dataPoint", propertyName: "fill" },
            dataLabelShow: { objectName: "labels", propertyName: "show" },
            legendShow: { objectName: "legend", propertyName: "show" },
            legendShowTitle: { objectName: "legend", propertyName: "showTitle" },
            legendTitleText: { objectName: "legend", propertyName: "titleText" },
        };

        public static formatStringProp: DataViewObjectPropertyIdentifier = {
            objectName: "general",
            propertyName: "formatString",
        };

        private static VisualClassName = "boxWhiskerChart";

        private static Axis: ClassAndSelector = { class: "axis", selector: ".axis" };
        private static AxisX: ClassAndSelector = { class: "axisX", selector: ".axisX" };
        private static AxisGrid: ClassAndSelector = { class: "axisGrid", selector: ".axisGrid" };
        private static AxisY: ClassAndSelector = { class: "axisY", selector: ".axisY" };
        private static AxisNode: ClassAndSelector = { class: "axisNode", selector: ".axisNode" };
        private static AxisLabel: ClassAndSelector = { class: "axisLabel", selector: ".axisLabel" };
        private static Chart: ClassAndSelector = { class: "chart", selector: ".chart" };
        private static ChartNode: ClassAndSelector = { class: 'chartNode', selector: '.chartNode' };
        private static ChartQuartileBox: ClassAndSelector = { class: 'chartQuartileBox', selector: '.chartQuartileBox' };
        private static ChartMedianLine: ClassAndSelector = { class: 'chartMedianLine', selector: '.chartMedianLine' };
        private static ChartMinLine: ClassAndSelector = { class: 'chartMinLine', selector: '.chartMinLine' };
        private static ChartMaxLine: ClassAndSelector = { class: 'chartMaxLine', selector: '.chartMaxLine' };
        private static ChartVerticalLine: ClassAndSelector = { class: 'chartVerticalLine', selector: '.chartVerticalLine' };
        private static ChartAverageDot: ClassAndSelector = { class: 'chartAverageDot', selector: '.chartAverageDot' };
        private static ChartOutlierDot: ClassAndSelector = { class: 'chartOutlierDot', selector: '.chartOutlierDot' };
        private static ChartDataLabel: ClassAndSelector = { class: "chartDataLabel", selector: ".chartDataLabel" };

        private svg: D3.Selection;
        private axis: D3.Selection;
        private chart: D3.Selection;

        private axisX: D3.Selection;
        private axisY: D3.Selection;
        private axisGrid: D3.Selection;
        private axisOptions: BoxWhiskerAxisOptions;

        private mainGroupElement: D3.Selection;
        private colors: IDataColorPalette;
        private selectionManager: SelectionManager;
        private viewport: IViewport;
        private hostServices: IVisualHostServices;
        private dataView: DataView;
        private data: BoxWhiskerChartData;

        private margin: IMargin;
        private legend: ILegend;
        private format: string;

        private LegendPadding: number = 5;
        private DefaultLegendSize: number = 20;
        private LegendSize: number = this.DefaultLegendSize;
        private AxisSizeY: number = 40;
        private AxisSizeX: number = 0;
        private ChartPadding: number = 25;

        private static DefaultMargin: IMargin = {
            top: 50,
            bottom: 50,
            right: 100,
            left: 100
        };

        public converter(dataView: DataView, colors: IDataColorPalette): BoxWhiskerChartData {
            if (!dataView ||
                dataView.table ||
				!dataView.categorical ||
                !dataView.categorical.values ||
                dataView.categorical.values.length < 1 ||                
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0]) {
                return {
                    dataPoints: [],
                    legendData: {
                        dataPoints: []
                    }
                };
            }
            var columns = dataView.categorical.values;

            var formatNoSI = d3.format(',.1f');
            var formatSI = d3.format('.4s');

            var formatLabels = (value) => {
                return value < 5000 ? formatNoSI(value) : formatSI(value);
            }

            var dataPoints: BoxWhiskerChartDatapoint[][] = [];
            var legendData: LegendData = {
                fontSize: 8.25,
                dataPoints: [],
                title: dataView.categorical.values.source.displayName
            };

            for (var i = 0, iLen = columns.length; i < iLen; i++) {
                var values = columns[i].values.filter(function (value) { return value != null; });

                if (values.length == 0) {
                    break;
                }
                var selector = { data: [columns[i].identity], };
                var id = new SelectionId(selector, false);
                var colorHelper = new ColorHelper(this.colors, BoxWhiskerChart.properties.fill, this.colors.getColorByIndex(i).value);

                legendData.dataPoints.push({
                    label: columns[i].source.groupName == null ? '(blank)' : columns[i].source.groupName,
                    color: colorHelper.getColorForSeriesValue(columns.grouped()[i].objects, columns.identityFields, columns.grouped()[i].name),
                    icon: LegendIcon.Box,
                    selected: false,
                    identity: id
                });

                var sortedValue = values.sort((n1, n2) => n1 - n2);

                var median = (
                    sortedValue[Math.floor((sortedValue.length - 1) / 2)] +
                    sortedValue[Math.ceil((sortedValue.length - 1) / 2)]) / 2;

                var q1 = sortedValue.length == 3 ? 0 : (sortedValue.length - 1) / 4;

                var q1LowValue = sortedValue[Math.floor(q1)];
                var q1HighValue = sortedValue[Math.ceil(q1)];

                var quartile1 = sortedValue.length <= 2 ? null : q1LowValue + ((q1 - Math.floor(q1)) * (q1HighValue - q1LowValue));

                var q3 = sortedValue.length == 3 ? 2 : 3 * q1;

                var q3LowValue = sortedValue[Math.floor(q3)];
                var q3HighValue = sortedValue[Math.ceil(q3)];

                var quartile3 = sortedValue.length <= 2 ? null : q3LowValue + (((3 * q1) - Math.floor(3 * q1)) * (q3HighValue - q3LowValue));

                var minValue
                var maxValue
                var minValueLabel
                var maxValueLabel
                var whiskerType = this.getWhiskerType(this.dataView);

                if (!quartile1 || !quartile3) {
                    whiskerType = BoxWhiskerTypeOptions.ChartType.MinMax;
                }

                switch (whiskerType) {
                    case BoxWhiskerTypeOptions.ChartType.MinMax:
                        minValue = sortedValue[0];
                        maxValue = sortedValue[sortedValue.length - 1];
                        minValueLabel = "Minimum";
                        maxValueLabel = "Maximum";
                        break;
                    case BoxWhiskerTypeOptions.ChartType.Standard:
                        var IQR = quartile3 - quartile1;
                        minValue = sortedValue.filter((value) => value >= quartile1 - (1.5 * IQR))[0];
                        maxValue = sortedValue.filter((value) => value <= quartile3 + (1.5 * IQR)).reverse()[0];
                        minValueLabel = "Minimum";
                        maxValueLabel = "Maximum";
                        break;
                    case BoxWhiskerTypeOptions.ChartType.IQR:
                        var IQR = quartile3 - quartile1;
                        minValue = quartile1 - (1.5 * IQR);
                        maxValue = quartile3 + (1.5 * IQR);
                        minValueLabel = "Q1 - 1.5 x IQR";
                        maxValueLabel = "Q3 + 1.5 x IQR";
                        break;
                }

                var ttl: number = 0;
                sortedValue.forEach(value => { ttl += value; });
                var avgvalue = ttl / sortedValue.length;

                dataPoints.push([]);

                this.format = dataView.categorical.values[0].source.format ? dataView.categorical.values[0].source.format : "#,0.00";
                var outliers = this.getShowOutliers(this.dataView) ?
                    sortedValue
                        .filter((value) => value < minValue || value > maxValue) // Filter outliers 
                        .filter((value, index, self) => self.indexOf(value) == index) // Make unique
                    : [];

                dataPoints[i].push({
                    min: minValue,
                    max: maxValue,
                    quartile1: quartile1,
                    quartile3: quartile3,
                    median: median,
                    average: avgvalue,
                    samples: sortedValue.length,
                    category: i + 1,
                    outliers: outliers,
                    dataLabels: (this.getDataLabelShow(this.dataView)) ?
                        [maxValue, minValue, avgvalue, median, quartile1, quartile3]
                            .filter((value, index, self) => self.indexOf(value) == index) // Make unique
                            .map((dataPoint) => { return { value: dataPoint, x: 0, y: 0 } })
                            .concat(outliers.map((outlier) => { return { value: outlier, x: 0, y: 0 } }))
                        : [],
                    label: columns[i].source.groupName == null ? '(blank)' : columns[i].source.groupName,
                    identity: id,
                    color: colorHelper.getColorForSeriesValue(columns.grouped()[i].objects, columns.identityFields, columns.grouped()[i].name),
                    tooltipInfo: [
                        {
                            displayName: 'Group',
                            value: columns[i].source.groupName == null ? '(blank)' : columns[i].source.groupName,
                        },
                        {
                            displayName: '# Samples',
                            value: valueFormatter.format(sortedValue.length, 'd', false),
                        },
                        {
                            displayName: maxValueLabel,
                            value: valueFormatter.format(maxValue, this.format, true),
                        },
                        {
                            displayName: 'Quartile 3',
                            value: valueFormatter.format(quartile3, this.format, true),
                        },
                        {
                            displayName: 'Median',
                            value: valueFormatter.format(median, this.format, true),
                        },
                        {
                            displayName: 'Average',
                            value: valueFormatter.format(avgvalue, this.format, true),
                        },
                        {
                            displayName: 'Quartile 1',
                            value: valueFormatter.format(quartile1, this.format, true),
                        },
                        {
                            displayName: minValueLabel,
                            value: valueFormatter.format(minValue, this.format, true),
                        }]
                });
            }
            return {
                dataPoints: dataPoints,
                legendData: legendData
            };
        }

        public constructor(options?: BoxWhiskerChartConstructorOptions) {

            if (options) {
                if (options.svg) {
                    this.svg = options.svg;
                }
                if (options.margin) {
                    this.margin = options.margin;
                }
            }
        }

        public init(options: VisualInitOptions): void {
            var element = options.element;
            this.hostServices = options.host;
            this.colors = options.style.colorPalette.dataColors;
            this.selectionManager = new SelectionManager({ hostServices: options.host });

            this.legend = createLegend(element, false, null, true, LegendPosition.Top);

            if (!this.svg) {
                this.svg = d3.select(element.get(0)).append('svg');
            }

            if (!this.margin) {
                this.margin = BoxWhiskerChart.DefaultMargin;
            }

            this.svg.classed(BoxWhiskerChart.VisualClassName, true);

            this.colors = options.style.colorPalette.dataColors;
            this.mainGroupElement = this.svg.append("g");

            this.axis = this.mainGroupElement
                .append("g")
                .classed(BoxWhiskerChart.Axis.class, true);

            this.axisX = this.axis
                .append("g")
                .classed(BoxWhiskerChart.AxisX.class, true);

            this.axisGrid = this.axis
                .append("g")
                .classed(BoxWhiskerChart.AxisGrid.class, true);

            this.axisY = this.axis
                .append("g")
                .classed(BoxWhiskerChart.AxisY.class, true);

            this.chart = this.mainGroupElement
                .append("g")
                .classed(BoxWhiskerChart.Chart.class, true);

            Legend.positionChartArea(this.svg, this.legend);
        }

        public update(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews[0]) {
                this.chart.selectAll(BoxWhiskerChart.ChartNode.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisX.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisY.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisGrid.selector).remove();
                return;
            };

            var dataView = this.dataView = options.dataViews[0],
                data = this.data = this.converter(dataView, this.colors),
                dataPoints = data.dataPoints,
                dataViewMetadataColumn: DataViewMetadataColumn,
                duration = options.suppressAnimations ? 0 : 250;

            this.viewport = {
                height: options.viewport.height > 0 ? options.viewport.height : 0,
                width: options.viewport.width > 0 ? options.viewport.width : 0
            };

            var legendProperties: DataViewObject = {
                show: this.getLegendShow(this.dataView),
                showTitle: this.getLegendShowTitle(this.dataView),
                titleText: this.getLegendTitleText(this.dataView),
            }
            LegendData.update(data.legendData, legendProperties);
            if (!this.getLegendShow(this.dataView)) {
                this.LegendSize = this.LegendPadding;
            }
            else {
                this.LegendSize = this.DefaultLegendSize + this.LegendPadding;
            }

            this.legend.changeOrientation(LegendPosition.Top);
            this.legend.drawLegend(data.legendData, this.viewport);

            this.svg
                .attr({
                    'height': this.viewport.height,
                    'width': this.viewport.width
                });

            var mainGroup = this.chart;
            mainGroup.attr('transform', 'scale(1, -1)' + SVGUtil.translate(0, -this.viewport.height + this.AxisSizeX));

            // calculate scalefactor
            var stack = d3.layout.stack();
            var layers = stack(dataPoints);

            this.axisOptions = this.getAxisOptions(
                d3.min(layers, (layer) => {
                    return d3.min(layer, (point) => {
                        return d3.min([point.min, d3.min(point.outliers)]);
                    });
                }),
                d3.max(layers, (layer) => {
                    return d3.max(layer, (point) => {
                        return d3.max([point.max, d3.max(point.outliers)]);
                    });
                }));

            var yScale = d3.scale.linear()
                .domain([this.axisOptions.min, this.axisOptions.max])
                .range([this.ChartPadding, this.viewport.height - this.AxisSizeX - this.LegendSize]);

            var xScale = d3.scale.linear()
                .domain([1, dataPoints.length + 1])
                .range([this.AxisSizeY, this.viewport.width - this.AxisSizeY]);

            if (dataPoints.length == 0) {
                this.chart.selectAll(BoxWhiskerChart.ChartNode.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisX.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisY.selector).remove();
                this.axis.selectAll(BoxWhiskerChart.AxisGrid.selector).remove();

                var warnings: IVisualWarning[] = [];
                warnings.push({
                    code: 'DataSetIvalid',
                    getMessages: () => {
                        var visualMessage: IVisualErrorMessage = {
                            message: "Dataset is not valid or too small/empty for this visualization.",
                            title: '',
                            detail: '',
                        };
                        return visualMessage;
                    }
                });

                this.hostServices.setWarnings(warnings);

                return;
            }

            this.drawChart(dataPoints, xScale, yScale, duration);
            this.drawAxis(dataPoints, yScale, duration);
        }

        private drawAxis(dataPoints: BoxWhiskerChartDatapoint[][], yScale: D3.Scale.Scale, duration: number) {
            if ((this.axis.selectAll(BoxWhiskerChart.AxisX.selector)[0].length == 0) ||
                (this.axis.selectAll(BoxWhiskerChart.AxisY.selector)[0].length == 0) ||
                (this.axis.selectAll(BoxWhiskerChart.AxisGrid.selector)[0].length == 0)) {
                this.axisGrid = this.axis
                    .append("g")
                    .classed(BoxWhiskerChart.AxisGrid.class, true);

                this.axisX = this.axis
                    .append("g")
                    .classed(BoxWhiskerChart.AxisX.class, true);

                this.axisY = this.axis
                    .append("g")
                    .classed(BoxWhiskerChart.AxisY.class, true);
            }

            var xs = d3.scale.ordinal();
            xs.domain(dataPoints.map((values) => { return values[0].label; }))
                .rangeBands([this.AxisSizeY, this.viewport.width - this.AxisSizeY]);

            var ys = yScale.range([this.viewport.height - this.AxisSizeX - this.ChartPadding, this.LegendSize]);

            var xAxisTransform =
                this.axisOptions.min > 0 ?
                    ys(this.axisOptions.min) :
                    this.axisOptions.max < 0 ?
                        ys(this.axisOptions.min) :
                        ys(0);

            var xAxis = d3.svg.axis()
                .scale(xs)
                .orient("bottom")
                .tickSize(0)
                .innerTickSize(8 + ((this.viewport.height - this.ChartPadding - this.AxisSizeX) - xAxisTransform));

            var yAxis = d3.svg.axis()
                .scale(ys)
                .orient("left")
                .tickFormat(d3.format("s"))
                .ticks(this.axisOptions.ticks);

            this.axisX
                .attr("transform", "translate(0, " + xAxisTransform + ")")
                .transition()
                .duration(duration)
                .call(xAxis);

            this.axisY
                .attr("transform", "translate(" + this.AxisSizeY + ", 0)")
                .transition()
                .duration(duration)
                .call(yAxis);

            if (this.getShowMajorGridLines(this.dataView)) {
                var yGrid = d3.svg.axis()
                    .scale(ys)
                    .orient("left")
                    .ticks(this.axisOptions.ticks * (this.getShowMinorGridLines(this.dataView) ? 5 : 1))
                    .outerTickSize(0)
                    .innerTickSize(-(this.viewport.width - (2 * this.AxisSizeY)));

                this.axisGrid
                    .attr("transform", "translate(" + this.AxisSizeY + ", 0)")
                    .attr("opacity", 1)
                    .transition()
                    .duration(duration)
                    .call(yGrid);
            }
            else {
                this.axisGrid.attr("opacity", 0);
            }
        }

        private drawChart(dataPoints: BoxWhiskerChartDatapoint[][], xScale: D3.Scale.Scale, yScale: D3.Scale.Scale, duration: number): void {
            var opacity: number = .5,
                dotRadius: number = 5;

            var stack = d3.layout.stack();
            var layers = stack(dataPoints);

            var sm = this.selectionManager;

            var selection = this.chart.selectAll(BoxWhiskerChart.ChartNode.selector).data(layers);

            selection
                .enter()
                .append('g')
                .classed(BoxWhiskerChart.ChartNode.class, true);

            var quartile = selection.selectAll(BoxWhiskerChart.ChartQuartileBox.selector).data(d => {
                if (d && d.length > 0) { return [d]; }
                return [];
            });

            this.svg.on('click', () => this.selectionManager.clear().then(() => quartile.style('opacity', 1)));

            var quartileData = (points) => {
                return points.map((value) => {
                    var x1 = xScale(value.category + 0.25);
                    var x2 = xScale(value.category + 0.5);
                    var x3 = xScale(value.category + 0.75);
                    var y1 = yScale(value.min);
                    var y2 = value.samples <= 3 ? yScale(value.min) : yScale(value.quartile1);
                    var y3 = value.samples <= 3 ? yScale(value.max) : yScale(value.quartile3);
                    var y4 = yScale(value.max);
                    return `M ${x1},${y1}L${x3},${y1}L${x2},${y1}L${x2},${y2} L${x1},${y2}L${x1},${y3}L${x2},${y3} L${x2},${y4}L${x1},${y4}L${x3},${y4}L${x2},${y4}L${x2},${y3} L${x3},${y3}L${x3},${y2}L${x2},${y2}L${x2},${y1}`;
                }).join(' ')
            };

            var medianData = (points) => {
                return points.map((value) => {
                    var x1 = xScale(value.category + 0.25);
                    var y1 = yScale(value.median);
                    var x2 = xScale(value.category + 0.75);
                    var y2 = yScale(value.median);
                    return `M ${x1},${y1} L${x2},${y2}`;
                }).join(' ')
            };

            var avgData = (points) => {
                return points.map((value) => {
                    var x1 = xScale(value.category + 0.5);
                    var y1 = yScale(value.average);
                    var r = dotRadius;
                    var r2 = 2 * r;
                    return `M ${x1},${y1} m -${r}, 0 a ${r},${r} 0 1,1 ${r2},0 a ${r},${r} 0 1,1 -${r2},0`;
                }).join(' ')
            };

            var outlierData = (points) => {
                return points.map((value) => {
                    var x1 = xScale(value.category + 0.5);
                    var y1 = yScale(value.value);
                    var r = dotRadius;
                    var r2 = 2 * r;
                    return `M ${x1},${y1} m -${r}, 0 a ${r},${r} 0 1,1 ${r2},0 a ${r},${r} 0 1,1 -${r2},0`;
                }).join(' ')
            };

            quartile
                .enter()
                .append('path')
                .classed(BoxWhiskerChart.ChartQuartileBox.class, true);

            quartile
                .style('fill', value => value[0].color)
                .attr('opacity', 1)
                .on('click', function (d) {
                    sm.select(d[0].identity).then((ids) => {
                        if (ids.length > 0) {
                            quartile.style('opacity', 0.5);
                            d3.select(this).transition()
                                .duration(duration)
                                .style('opacity', 1);
                        } else {
                            quartile.style('opacity', 1);
                        }
                    });
                    d3.event.stopPropagation();
                })
                .style('stroke', value => value[0].color)
                .style('stroke-width', 2)
                .transition()
                .duration(duration)
                .attr('d', quartileData);

            quartile.exit().remove();

            var average = selection.selectAll(BoxWhiskerChart.ChartAverageDot.selector).data(d => {
                if (d && d.length > 0) { return [d]; }
                return [];
            });

            average
                .enter()
                .append('path')
                .classed(BoxWhiskerChart.ChartAverageDot.class, true);

            average
                .style('fill', 'black')
                .transition()
                .duration(duration)
                .attr('d', avgData);

            average.exit().remove();

            var median = selection.selectAll(BoxWhiskerChart.ChartMedianLine.selector).data(d => {
                if (d && d.length > 0) { return [d]; }
                return [];
            });

            median
                .enter()
                .append('path')
                .classed(BoxWhiskerChart.ChartMedianLine.class, true);

            median
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .transition()
                .duration(duration)
                .attr('d', medianData);

            median.exit().remove();

            var outliers = selection.selectAll(BoxWhiskerChart.ChartOutlierDot.selector).data(d => {
                if (d[0].outliers && d[0].outliers.length > 0) {
                    return d[0].outliers.map((dataPoint) => {
                        return [{
                            category: d[0].category,
                            color: d[0].color,
                            value: dataPoint
                        }
                        ]
                    });
                }
                return [];
            });

            outliers
                .enter()
                .append('path')
                .classed(BoxWhiskerChart.ChartOutlierDot.class, true);

            outliers
                .style('fill', value => value[0].color)
                .transition()
                .duration(duration)
                .attr('d', outlierData);

            outliers.exit().remove();

            var dataLabels = selection.selectAll(BoxWhiskerChart.ChartDataLabel.selector).data(d => {
                if (d[0].dataLabels && d[0].dataLabels.length > 0) {
                    var topLabels = d[0].dataLabels
                        .filter((dataLabel) => dataLabel.value >= d[0].median) // Higher half of data labels
                        .sort((dataLabel1, dataLabel2) => dataLabel1.value - dataLabel2.value); // Sort: median index 0
                    var lowerLabels = d[0].dataLabels
                        .filter((dataLabel) => dataLabel.value <= d[0].median) // Lower half of data labels
                        .sort((dataLabel1, dataLabel2) => dataLabel2.value - dataLabel1.value); // Sort: median index 0
                    var x = xScale(d[0].category + 0.77)

                    topLabels[0].y = yScale(d[0].median) - 4;
                    topLabels[0].x = xScale(d[0].category + 0.77);
                    lowerLabels[0].y = yScale(d[0].median) - 4;
                    lowerLabels[0].x = xScale(d[0].category + 0.77);

                    var adjustment = 0;

                    for (var i = 1; i < topLabels.length; i++) {
                        topLabels[i].y = yScale(topLabels[i].value) - 4;
                        topLabels[i].x = x;
                        var diff = Math.abs((topLabels[i].y + adjustment) - (topLabels[i - 1].y));
                        if (diff < 10) {
                            adjustment += (10 - diff);
                        } else {
                            adjustment = 0;
                        }
                        topLabels[i].y += adjustment;
                    }
                    adjustment = 0;
                    for (var i = 1; i < lowerLabels.length; i++) {
                        lowerLabels[i].y = yScale(lowerLabels[i].value) - 4;
                        lowerLabels[i].x = x;
                        var diff = Math.abs((lowerLabels[i].y + adjustment) - lowerLabels[i - 1].y);
                        if (diff < 10) {
                            adjustment -= (10 - diff);
                        } else {
                            adjustment = 0;
                        }
                        lowerLabels[i].y += adjustment;
                    }
                    var dataLabels = lowerLabels.concat(topLabels.filter((dataLabel) => dataLabel.value > d[0].median)).filter((dataLabel) => dataLabel.x > 0);
                    return dataLabels.map((dataPoint) => {
                        return dataPoint;
                    });

                }
                return [];
            });

            dataLabels
                .enter()
                .append("text")
                .classed(BoxWhiskerChart.ChartDataLabel.class, true);

            var y0 = this.viewport.height + this.AxisSizeX;

            dataLabels
                .attr("transform", dataLabel => `translate(0 ${y0}) scale(1, -1)`)
                .transition()
                .duration(duration)
                .text(dataLabel => valueFormatter.format(dataLabel.value, this.format, true))
                .attr("x", dataLabel => dataLabel.x)
                .attr("y", dataLabel => y0 - dataLabel.y)
                .attr("fill", "black");

            dataLabels.exit().remove();

            TooltipManager.addTooltip(quartile, (tooltipEvent: TooltipEvent) => {
                return tooltipEvent.data[0].tooltipInfo;
            }, true);

            TooltipManager.addTooltip(median, (tooltipEvent: TooltipEvent) => {
                return tooltipEvent.data[0].tooltipInfo;
            }, true);

            TooltipManager.addTooltip(average, (tooltipEvent: TooltipEvent) => {
                return tooltipEvent.data[0].tooltipInfo;
            }, true);

            TooltipManager.addTooltip(outliers, (tooltipEvent: TooltipEvent) => {
                return [{
                    displayName: "Outlier value",
                    value: tooltipEvent.data[0].value,
                }]
            }, true);

            selection.exit().remove();
        }

        public static getValueArray(nodes: DataViewTreeNode, index: number): Array<number> {
            var rArray: Array<number> = [];

            if (nodes.children == null) {
                if (nodes.values[index].value != null) {
                    rArray.push(nodes.values[index].value);
                }
                return rArray
            }
            else {
                for (var i = 0; i < nodes.children.length; i++) {
                    rArray = rArray.concat(this.getValueArray(nodes.children[i], index));
                }
                return rArray;
            }
        }

        private getAxisOptions(min: number, max: number): BoxWhiskerAxisOptions {
            var min1 = min == 0 ? 0 : min > 0 ? (min * .99) - ((max - min) / 100) : (min * 1.01) - ((max - min) / 100);
            var max1 = max == 0 ? min == 0 ? 1 : 0 : max < 0 ? (max * .99) + ((max - min) / 100) : (max * 1.01) + ((max - min) / 100);

            var p = Math.log(max1 - min1) / Math.log(10);
            var f = Math.pow(10, p - Math.floor(p));

            var scale = 0.2;

            if (f <= 1.2) scale = 0.2
            else if (f <= 2.5) scale = 0.2
            else if (f <= 5) scale = 0.5
            else if (f <= 10) scale = 1
            else scale = 2

            var tickSize = scale * Math.pow(10, Math.floor(p));
            var maxValue = tickSize * (Math.floor(max1 / tickSize) + 1)
            var minValue = tickSize * Math.floor(min1 / tickSize)
            var ticks = ((maxValue - minValue) / tickSize) + 1

            return {
                tickSize: tickSize,
                max: maxValue,
                min: minValue,
                ticks: ticks,
            };
        }

        private getWhiskerType(dataView: DataView): BoxWhiskerTypeOptions.ChartType {
            return DataViewObjects.getValue(this.dataView.metadata.objects, BoxWhiskerChart.properties.whiskerType, BoxWhiskerTypeOptions.ChartType.MinMax);
        }

        private getShowOutliers(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhiskerChart.properties.showOutliers, false);
        }

        private getShowMajorGridLines(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhiskerChart.properties.showMajorGridLines, true);
        }

        private getShowMinorGridLines(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhiskerChart.properties.showMinorGridLines, false);
        }

        private getDataLabelShow(dataView: DataView): boolean {
            return DataViewObjects.getValue(this.dataView.metadata.objects, BoxWhiskerChart.properties.dataLabelShow, false);
        }

        private getLegendShow(dataView: DataView): boolean {
            return DataViewObjects.getValue(this.dataView.metadata.objects, BoxWhiskerChart.properties.legendShow, true);
        }

        private getLegendShowTitle(dataView: DataView): boolean {
            return DataViewObjects.getValue(this.dataView.metadata.objects, BoxWhiskerChart.properties.legendShowTitle, true);
        }

        private getLegendTitleText(dataView: DataView): string {
            return DataViewObjects.getValue(dataView.metadata.objects, BoxWhiskerChart.properties.legendTitleText, this.data.legendData.title);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];

            switch (options.objectName) {
                case "chartOptions":
                    var chartOptions: VisualObjectInstance = {
                        objectName: "chartOptions",
                        displayName: "Chart Options",
                        selector: null,
                        properties: {
                            whisker: this.getWhiskerType(this.dataView),
                            outliers: this.getShowOutliers(this.dataView),
                        }
                    };
                    instances.push(chartOptions);
                    break;
                case "dataPoint":
                    var categories = this.dataView.categorical.values;
                    for (var i = 0; i < categories.length; i++) {
                        var dataPoint: VisualObjectInstance = {
                            objectName: "dataPoint",
                            displayName: this.data.dataPoints[i][0].label,
                            selector: ColorHelper.normalizeSelector(this.data.dataPoints[i][0].identity.getSelector(), true),
                            properties: {
                                fill: { solid: { color: this.data.dataPoints[i][0].color } }
                            }
                        };
                        instances.push(dataPoint);
                    }
                    break;
                case "gridLines":
                    var gridLines: VisualObjectInstance = {
                        objectName: "gridLines",
                        displayName: "Grid lines",
                        selector: null,
                        properties: {
                            majorGrid: this.getShowMajorGridLines(this.dataView),
                            minorGrid: this.getShowMinorGridLines(this.dataView),
                        }
                    };
                    instances.push(gridLines);
                    break;
                case "labels":
                    var labels: VisualObjectInstance = {
                        objectName: "labels",
                        displayName: "Data labels",
                        selector: null,
                        properties: {
                            show: this.getDataLabelShow(this.dataView),
                        }
                    };
                    instances.push(labels);
                    break;
                case "legend":
                    var legend: VisualObjectInstance = {
                        objectName: "legend",
                        displayName: "Legend",
                        selector: null,
                        properties: {
                            show: this.getLegendShow(this.dataView),
                            showTitle: this.getLegendShowTitle(this.dataView),
                            titleText: this.getLegendTitleText(this.dataView)
                        }
                    };
                    instances.push(legend);
                    break;
            }

            return instances;
        }
    }
}
