using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using protos;

namespace Backend.Services;

public class ThamSoServiceImpl(
    DynamicFieldService dynamicFieldService,
    FieldSetService fieldSetService,
    FormConfigService formConfigService,
    DynamicMenuService dynamicMenuService,
    DynamicMenuDataSourceService dynamicMenuDataSourceService,
    TemplateLayoutService templateLayoutService,
    TemplateExportService templateExportService,
    ProtoSchemaDiscoveryService protoSchemaDiscoveryService) : ThamSoService.ThamSoServiceBase
{
    [Authorize]
    public override Task<GetListDynamicFieldsResponse> GetListDynamicFields(
        GetListDynamicFieldsRequest request, ServerCallContext context) =>
        dynamicFieldService.GetListDynamicFieldsAsync(request);

    [Authorize]
    public override Task<SaveDynamicFieldResponse> SaveDynamicField(
        SaveDynamicFieldRequest request, ServerCallContext context) =>
        dynamicFieldService.SaveDynamicFieldAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteDynamicField(
        DeleteDynamicFieldRequest request, ServerCallContext context) =>
        dynamicFieldService.DeleteDynamicFieldAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreDynamicField(
        RestoreDynamicFieldRequest request, ServerCallContext context) =>
        dynamicFieldService.RestoreDynamicFieldAsync(request, context);

    [Authorize]
    public override Task<GetListFieldSetsResponse> GetListFieldSets(
        GetListFieldSetsRequest request, ServerCallContext context) =>
        fieldSetService.GetListFieldSetsAsync(request);

    [Authorize]
    public override Task<SaveFieldSetResponse> SaveFieldSet(
        SaveFieldSetRequest request, ServerCallContext context) =>
        fieldSetService.SaveFieldSetAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteFieldSet(
        DeleteFieldSetRequest request, ServerCallContext context) =>
        fieldSetService.DeleteFieldSetAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreFieldSet(
        RestoreFieldSetRequest request, ServerCallContext context) =>
        fieldSetService.RestoreFieldSetAsync(request, context);

    [Authorize]
    public override Task<GetListFormConfigsResponse> GetListFormConfigs(
        GetListFormConfigsRequest request, ServerCallContext context) =>
        formConfigService.GetListFormConfigsAsync(request);

    [Authorize]
    public override Task<SaveFormConfigResponse> SaveFormConfig(
        SaveFormConfigRequest request, ServerCallContext context) =>
        formConfigService.SaveFormConfigAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteFormConfig(
        DeleteFormConfigRequest request, ServerCallContext context) =>
        formConfigService.DeleteFormConfigAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreFormConfig(
        RestoreFormConfigRequest request, ServerCallContext context) =>
        formConfigService.RestoreFormConfigAsync(request, context);

    [Authorize]
    public override Task<GetListDynamicMenusResponse> GetListDynamicMenus(
        GetListDynamicMenusRequest request, ServerCallContext context) =>
        dynamicMenuService.GetListDynamicMenusAsync(request, context);

    [Authorize]
    public override Task<GetDynamicMenuRowsResponse> GetDynamicMenuRows(
        GetDynamicMenuRowsRequest request, ServerCallContext context) =>
        dynamicMenuService.GetDynamicMenuRowsAsync(request, context);

    [Authorize]
    public override Task<SaveDynamicMenuResponse> SaveDynamicMenu(
        SaveDynamicMenuRequest request, ServerCallContext context) =>
        dynamicMenuService.SaveDynamicMenuAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteDynamicMenu(
        DeleteDynamicMenuRequest request, ServerCallContext context) =>
        dynamicMenuService.DeleteDynamicMenuAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreDynamicMenu(
        RestoreDynamicMenuRequest request, ServerCallContext context) =>
        dynamicMenuService.RestoreDynamicMenuAsync(request, context);

    [Authorize]
    public override Task<GetListDynamicMenuDataSourcesResponse> GetListDynamicMenuDataSources(
        GetListDynamicMenuDataSourcesRequest request, ServerCallContext context) =>
        dynamicMenuDataSourceService.GetListDynamicMenuDataSourcesAsync(request);

    [Authorize]
    public override Task<SaveDynamicMenuDataSourceResponse> SaveDynamicMenuDataSource(
        SaveDynamicMenuDataSourceRequest request, ServerCallContext context) =>
        dynamicMenuDataSourceService.SaveDynamicMenuDataSourceAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteDynamicMenuDataSource(
        DeleteDynamicMenuDataSourceRequest request, ServerCallContext context) =>
        dynamicMenuDataSourceService.DeleteDynamicMenuDataSourceAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreDynamicMenuDataSource(
        RestoreDynamicMenuDataSourceRequest request, ServerCallContext context) =>
        dynamicMenuDataSourceService.RestoreDynamicMenuDataSourceAsync(request, context);

    [Authorize]
    public override Task<GetListTemplateLayoutsResponse> GetListTemplateLayouts(
        GetListTemplateLayoutsRequest request, ServerCallContext context) =>
        templateLayoutService.GetListTemplateLayoutsAsync(request);

    [Authorize]
    public override Task<SaveTemplateLayoutResponse> SaveTemplateLayout(
        SaveTemplateLayoutRequest request, ServerCallContext context) =>
        templateLayoutService.SaveTemplateLayoutAsync(request, context);

    [Authorize]
    public override Task<DeleteBaseResponse> DeleteTemplateLayout(
        DeleteTemplateLayoutRequest request, ServerCallContext context) =>
        templateLayoutService.DeleteTemplateLayoutAsync(request, context);

    [Authorize]
    public override Task<StatusResponse> RestoreTemplateLayout(
        RestoreTemplateLayoutRequest request, ServerCallContext context) =>
        templateLayoutService.RestoreTemplateLayoutAsync(request, context);

    [Authorize]
    public override Task ExportTemplateLayoutsStream(
        ExportTemplateLayoutsRequest request,
        IServerStreamWriter<JobProgressEvent> responseStream,
        ServerCallContext context) =>
        templateExportService.StreamExportTemplateLayoutsAsync(request, responseStream, context);

    [Authorize]
    public override Task<SyncDynamicMenuDataSourcesFromProtoResponse> SyncDynamicMenuDataSourcesFromProto(
        SyncDynamicMenuDataSourcesFromProtoRequest request, ServerCallContext context) =>
        protoSchemaDiscoveryService.SyncDynamicMenuDataSourcesFromProtoAsync(request, context);

    [Authorize]
    public override Task SyncDynamicMenuDataSourcesFromProtoStream(
        SyncDynamicMenuDataSourcesFromProtoRequest request,
        IServerStreamWriter<JobProgressEvent> responseStream,
        ServerCallContext context) =>
        protoSchemaDiscoveryService.SyncDynamicMenuDataSourcesFromProtoStreamAsync(request, responseStream, context);

    [Authorize]
    public override Task<DiscoverCollectionFieldsResponse> DiscoverCollectionFields(
        DiscoverCollectionFieldsRequest request, ServerCallContext context) =>
        protoSchemaDiscoveryService.DiscoverCollectionFieldsAsync(request);
}
