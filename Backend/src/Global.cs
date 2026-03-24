using Backend.Authorization;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Backend.Services;
using protos;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using Google.Protobuf.Collections;

namespace Backend.Services;

public static class Global
{
    // Static Logger for entire application
    public static ILogger? Logger { get; set; }

    public static MongoDB.Driver.MongoClient? MongoClient { get; set; }
    public static MongoDB.Driver.IMongoDatabase? MongoDB { set; get; }

    public static string? UriConnection { set; get; } = "localhost:27017";
    public static string? DBName { set; get; } = "";

    private static IMongoCollection<Employee>? _collectionEmployee;

    public static IMongoCollection<Employee>? CollectionEmployee
    {
        get
        {
            if (_collectionEmployee == null)
                _collectionEmployee = MongoDB?.GetCollection<Employee>("Employee");
            return _collectionEmployee;

        }
    }
    private static IMongoCollection<Office>? _collectionOffice;

    public static IMongoCollection<Office>? CollectionOffice
    {
        get
        {
            if (_collectionOffice == null)
                _collectionOffice = MongoDB?.GetCollection<Office>("Office");
            return _collectionOffice;

        }
    }
    private static IMongoCollection<Catalog>? _collectionCapBac;

    public static IMongoCollection<Catalog>? CollectionCapBac
    {
        get
        {
            if (_collectionCapBac == null)
                _collectionCapBac = MongoDB?.GetCollection<Catalog>("CapBac");
            return _collectionCapBac;

        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonEmployee;
    public static IMongoCollection<BsonDocument>? CollectionBsonEmployee
    {
        get
        {
            if (_collectionBsonEmployee == null)
                _collectionBsonEmployee = MongoDB?.GetCollection<BsonDocument>("Employee");
            return _collectionBsonEmployee;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonOffice;
    public static IMongoCollection<BsonDocument>? CollectionBsonOffice
    {
        get
        {
            if (_collectionBsonOffice == null)
                _collectionBsonOffice = MongoDB?.GetCollection<BsonDocument>("Office");
            return _collectionBsonOffice;
        }
    }
    private static IMongoCollection<BsonDocument>? _collectionBsonCapBac;
    public static IMongoCollection<BsonDocument>? CollectionBsonCapBac
    {
        get
        {
            if (_collectionBsonCapBac == null)
                _collectionBsonCapBac = MongoDB?.GetCollection<BsonDocument>("CapBac");
            return _collectionBsonCapBac;
        }
    }

    private static IMongoCollection<RelationShipObject>? collectionRelationShipObject;
    public static IMongoCollection<RelationShipObject>? CollectionRelationShipObject
    {
        get
        {
            if (collectionRelationShipObject == null)
                collectionRelationShipObject = MongoDB?.GetCollection<RelationShipObject>("RelationShips");
            return collectionRelationShipObject;
        }
    }
    private static IMongoCollection<BsonDocument>? collectionBsonRelationShipObject;
    public static IMongoCollection<BsonDocument>? CollectionBsonRelationShipObject
    {
        get
        {
            if (collectionBsonRelationShipObject == null)
                collectionBsonRelationShipObject = MongoDB?.GetCollection<BsonDocument>("RelationShips");
            return collectionBsonRelationShipObject;
        }
    }

    // ── ThamSo collections (Using BsonDocument for manual mapping) ───
    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicField;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicField
    {
        get
        {
            if (_collectionBsonDynamicField == null)
                _collectionBsonDynamicField = MongoDB?.GetCollection<BsonDocument>("DynamicField");
            return _collectionBsonDynamicField;
        }
    }

    private static IMongoCollection<DynamicField>? collectionDynamicField;
    public static IMongoCollection<DynamicField>? CollectionDynamicField
    {
        get
        {
            if (collectionDynamicField == null)
                collectionDynamicField = MongoDB?.GetCollection<DynamicField>("DynamicField");
            return collectionDynamicField;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonFieldSet;
    public static IMongoCollection<BsonDocument>? CollectionBsonFieldSet
    {
        get
        {
            if (_collectionBsonFieldSet == null)
                _collectionBsonFieldSet = MongoDB?.GetCollection<BsonDocument>("FieldSet");
            return _collectionBsonFieldSet;
        }
    }

    private static IMongoCollection<FieldSet>? collectionFieldSet;
    public static IMongoCollection<FieldSet>? CollectionFieldSet
    {
        get
        {
            if (collectionFieldSet == null)
                collectionFieldSet = MongoDB?.GetCollection<FieldSet>("FieldSet");
            return collectionFieldSet;
        }
    }
    private static IMongoCollection<BsonDocument>? _collectionBsonFormConfig;
    public static IMongoCollection<BsonDocument>? CollectionBsonFormConfig
    {
        get
        {
            if (_collectionBsonFormConfig == null)
                _collectionBsonFormConfig = MongoDB?.GetCollection<BsonDocument>("FormConfig");
            return _collectionBsonFormConfig;
        }
    }
    private static IMongoCollection<FormConfig>? collectionFormConfig;
    public static IMongoCollection<FormConfig>? CollectionFormConfig
    {
        get
        {
            if (collectionFormConfig == null)
                collectionFormConfig = MongoDB?.GetCollection<FormConfig>("FormConfig");
            return collectionFormConfig;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicMenu;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicMenu
    {
        get
        {
            if (_collectionBsonDynamicMenu == null)
                _collectionBsonDynamicMenu = MongoDB?.GetCollection<BsonDocument>("DynamicMenu");
            return _collectionBsonDynamicMenu;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicMenuDataSource;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicMenuDataSource
    {
        get
        {
            if (_collectionBsonDynamicMenuDataSource == null)
                _collectionBsonDynamicMenuDataSource = MongoDB?.GetCollection<BsonDocument>("DynamicMenuDataSource");
            return _collectionBsonDynamicMenuDataSource;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonTemplateLayout;
    public static IMongoCollection<BsonDocument>? CollectionBsonTemplateLayout
    {
        get
        {
            if (_collectionBsonTemplateLayout == null)
                _collectionBsonTemplateLayout = MongoDB?.GetCollection<BsonDocument>("TemplateLayout");
            return _collectionBsonTemplateLayout;
        }
    }

    // ── Permission management collections ─────────────────────────────────────

    private static IMongoCollection<NhomNguoiDung>? _collectionNhomNguoiDung;
    public static IMongoCollection<NhomNguoiDung>? CollectionNhomNguoiDung
    {
        get
        {
            if (_collectionNhomNguoiDung == null)
                _collectionNhomNguoiDung = MongoDB?.GetCollection<NhomNguoiDung>("NhomNguoiDung");
            return _collectionNhomNguoiDung;
        }
    }

    private static IMongoCollection<NguoiDungNhomNguoiDung>? _collectionNguoiDungNhomNguoiDung;
    public static IMongoCollection<NguoiDungNhomNguoiDung>? CollectionNguoiDungNhomNguoiDung
    {
        get
        {
            if (_collectionNguoiDungNhomNguoiDung == null)
                _collectionNguoiDungNhomNguoiDung = MongoDB?.GetCollection<NguoiDungNhomNguoiDung>("NguoiDungNhomNguoiDung");
            return _collectionNguoiDungNhomNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNguoiDung>? _collectionPhanQuyenPhanHeNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNguoiDung>? CollectionPhanQuyenPhanHeNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNguoiDung == null)
                _collectionPhanQuyenPhanHeNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNguoiDung>("PhanQuyenPhanHeNguoiDung");
            return _collectionPhanQuyenPhanHeNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? _collectionPhanQuyenPhanHeNhomNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? CollectionPhanQuyenPhanHeNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNhomNguoiDung == null)
                _collectionPhanQuyenPhanHeNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNhomNguoiDung>("PhanQuyenPhanHeNhomNguoiDung");
            return _collectionPhanQuyenPhanHeNhomNguoiDung;
        }
    }

    // PhanQuyenNguoiDung - typed (write) + BsonDocument (read with manual Actions mapping)
    private static IMongoCollection<PhanQuyenNguoiDung>? _collectionPhanQuyenNguoiDung;
    public static IMongoCollection<PhanQuyenNguoiDung>? CollectionPhanQuyenNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenNguoiDung == null)
                _collectionPhanQuyenNguoiDung = MongoDB?.GetCollection<PhanQuyenNguoiDung>("PhanQuyenNguoiDung");
            return _collectionPhanQuyenNguoiDung;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNguoiDungBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNguoiDungBson
    {
        get
        {
            if (_collectionPhanQuyenNguoiDungBson == null)
                _collectionPhanQuyenNguoiDungBson = MongoDB?.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
            return _collectionPhanQuyenNguoiDungBson;
        }
    }

    // PhanQuyenNhomNguoiDung - BsonDocument for read (Actions field), typed for write
    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNhomNguoiDungBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNhomNguoiDungBson
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDungBson == null)
                _collectionPhanQuyenNhomNguoiDungBson = MongoDB?.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
            return _collectionPhanQuyenNhomNguoiDungBson;
        }
    }

    private static IMongoCollection<PhanQuyenNhomNguoiDung>? _collectionPhanQuyenNhomNguoiDung;
    public static IMongoCollection<PhanQuyenNhomNguoiDung>? CollectionPhanQuyenNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDung == null)
                _collectionPhanQuyenNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenNhomNguoiDung>("PhanQuyenNhomNguoiDung");
            return _collectionPhanQuyenNhomNguoiDung;
        }
    }

    private static IMongoCollection<ThamSoNguoiDung>? _collectionUserParams;
    public static IMongoCollection<ThamSoNguoiDung>? CollectionUserParams
    {
        get
        {
            if (_collectionUserParams == null)
                _collectionUserParams = MongoDB?.GetCollection<ThamSoNguoiDung>("UserParams");
            return _collectionUserParams;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionPermissionCatalog;
    public static IMongoCollection<BsonDocument>? CollectionPermissionCatalog
    {
        get
        {
            if (_collectionPermissionCatalog == null)
                _collectionPermissionCatalog = MongoDB?.GetCollection<BsonDocument>("PermissionCatalog");
            return _collectionPermissionCatalog;
        }
    }

    public static void UseTBKTServices(this WebApplication app, IConfiguration config, string version)
    {
        // Initialize global logger
        Logger = app.Services.GetRequiredService<ILogger<object>>();

        // Khởi tạo MongoDB connection
        var mongoUri = config.GetValue<string>("MongoDB:Uri") ?? "mongodb://localhost:27017";
        var dbName = config.GetValue<string>("MongoDB:Database") ?? "quanly_dmcanbo";

        try
        {
            Global.MongoClient = new MongoClient(mongoUri);
            Global.MongoDB = Global.MongoClient.GetDatabase(dbName);
            Logger?.LogInformation("MongoDB connected: {MongoUri} - Database: {DbName}", mongoUri, dbName);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "MongoDB connection failed");
            throw;
        }


        // Đăng ký cho mọi RepeatedField type đang dùng
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<string>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicField>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FieldSet>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FormTabConfig>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FormConfig>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<Office>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<Employee>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<RelationShipObject>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSourceField>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSource>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenu>());
        BsonSerializer.RegisterSerializer(new MapFieldSerializer<string, bool>());

        BsonClassMap.RegisterClassMap<Employee>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
        });
        BsonClassMap.RegisterClassMap<Office>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapProperty(x => x.Parameters);
        });
        BsonClassMap.RegisterClassMap<FieldValidation>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.Options);
            c.SetIgnoreExtraElements(true);

        });
        BsonClassMap.RegisterClassMap<DynamicField>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapProperty(x => x.Validation);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FieldSet>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.FieldIds);
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FormTabConfig>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.FieldSetIds);
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FormConfig>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Tabs);
        });

        // ── ThamSo BsonClassMap ──────────────────────────────────────────
        // DynamicMenuDataSource entities
        BsonClassMap.RegisterClassMap<DynamicMenuDataSourceField>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);

        });
        BsonClassMap.RegisterClassMap<DynamicMenuDataSource>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id); 
            c.MapProperty(x => x.Fields);

        });
        BsonClassMap.RegisterClassMap<DynamicMenu>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id); 
            c.MapProperty(x => x.Columns);
        });


        // Note: Using BsonDocument and manual mapping for Proto classes to handle RepeatedField correctly.

        // ── Permission model BsonClassMaps ──────────────────────────────────────
        BsonClassMap.RegisterClassMap<NhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<NguoiDungNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenPhanHeNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenPhanHeNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Actions);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Actions);
        });
        BsonClassMap.RegisterClassMap<ThamSoNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });

        EnsureOfficeCollectionsAndIndexes();
        EnsureThamSoIndexes();
        EnsurePhanQuyenIndexes();
        EnsureNhomChuyenNganhSeed();
        EnsurePermissionCatalogSeed();
        EnsureDynamicMenuPermissionCatalogSeed();

        // Initialize default Office item with ID "000"
        InitializeDefaultOffice();

        app.MapGrpcService<EmployeeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<OfficeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<CatalogServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<ThamSoServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<PhanQuyenServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<NhomChuyenNganhServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<LichSuPhanQuyenScopeServiceImpl>().EnableGrpcWeb().RequireAuthorization();

        app.UseStaticFiles(new StaticFileOptions
        {
            ServeUnknownFileTypes = true,
            DefaultContentType = "application/octet-stream"
        });
        app.UseRouting();
        app.MapControllers();
        app.MapFallbackToFile("index.html");



    }

    private static void EnsureThamSoIndexes()
    {
        try
        {
            if (CollectionBsonDynamicMenuDataSource != null)
            {
                EnsureIndex(
                    CollectionBsonDynamicMenuDataSource,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("SourceKey")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_menu_datasource_sourcekey_delete" }));
            }

            if (CollectionBsonDynamicMenu != null)
            {
                EnsureIndex(
                    CollectionBsonDynamicMenu,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("DataSource")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_menu_datasource_delete" }));
            }

            if (CollectionBsonDynamicField != null)
            {
                EnsureIndex(
                    CollectionBsonDynamicField,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("Validation.DataSource")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_field_validation_datasource_delete" }));
            }

            if (CollectionBsonFieldSet != null)
            {
                EnsureIndex(
                    CollectionBsonFieldSet,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys.Ascending("FieldIds"),
                        new CreateIndexOptions { Name = "idx_thamso_fieldset_fieldids" }));
            }

            if (CollectionBsonFormConfig != null)
            {
                EnsureIndex(
                    CollectionBsonFormConfig,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys.Ascending("Tabs.FieldSetIds"),
                        new CreateIndexOptions { Name = "idx_thamso_formconfig_tabs_fieldsetids" }));
            }

            Logger?.LogInformation("Ensured MongoDB indexes for ThamSo collections");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure MongoDB indexes for ThamSo collections");
            throw;
        }
    }

    private static void EnsureOfficeCollectionsAndIndexes()
    {
        try
        {
            EnsureCollectionExists("NhomChuyenNganh");

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Path"),
                    new CreateIndexOptions { Name = "idx_office_path" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Depth"),
                    new CreateIndexOptions { Name = "idx_office_depth" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdCapTren"),
                    new CreateIndexOptions { Name = "idx_office_parent" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys
                        .Ascending("Parameters.Name")
                        .Ascending("Parameters.StringValue"),
                    new CreateIndexOptions { Name = "idx_office_parameter_name_stringvalue", Sparse = true }));

            Logger?.LogInformation("Ensured MongoDB collections and indexes for Office schema");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure MongoDB collections and indexes for Office schema");
            throw;
        }
    }

    private static void EnsurePhanQuyenIndexes()
    {
        try
        {
            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_user" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_group" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdDonViScope"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_anchor", Sparse = true }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("NgayHetHan"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_expire", Sparse = true }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNganhDoc"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_multinode" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_user_subsystem_user_module" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_group_subsystem_group_module" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserFunctionPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_user_function_user_module" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_group_function_group_module" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDuocPhanQuyen").Descending("NgayThucHien"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_target_time_desc" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiThucHien").Descending("NgayThucHien"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_actor_time_desc" }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("NgayHetHanMoi"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_expire_new", Sparse = true }));

            EnsureIndex(
                MongoDB!.GetCollection<BsonDocument>("NhomChuyenNganh"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("DanhSachCn"),
                    new CreateIndexOptions { Name = "idx_nhom_chuyen_nganh_danhsachcn" }));

            Logger?.LogInformation("Ensured MongoDB indexes for PhanQuyen collections");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure MongoDB indexes for PhanQuyen collections");
            throw;
        }
    }

    private static void EnsureNhomChuyenNganhSeed()
    {
        try
        {
            var collection = MongoDB!.GetCollection<BsonDocument>("NhomChuyenNganh");
            var now = DateTime.UtcNow;
            var seedItems = new[]
            {
                new { Id = "nhom_tc_dien_tu", Ten = "Tac chien dien tu", MoTa = "Nhom scope cho tac chien dien tu", DanhSachCn = new[] { "Thong tin", "Ra da" } },
                new { Id = "nhom_hai_quan", Ten = "Hai quan", MoTa = "Nhom scope cho khoi hai quan", DanhSachCn = new[] { "Thong tin", "Tau thuyen" } },
                new { Id = "nhom_phong_hoa", Ten = "Phong hoa NBC", MoTa = "Nhom scope cho phong hoa va hoa hoc", DanhSachCn = new[] { "Phong hoa", "Hoa hoc" } },
                new { Id = "nhom_khong_quan", Ten = "Khong quan", MoTa = "Nhom scope cho khoi khong quan", DanhSachCn = new[] { "Khong quan", "May bay" } },
                new { Id = "nhom_hau_can", Ten = "Hau can ky thuat", MoTa = "Nhom scope cho hau can, ky thuat, vat tu", DanhSachCn = new[] { "Hau can", "Ky thuat", "Vat tu" } },
            };

            var bulkOps = new List<WriteModel<BsonDocument>>();
            foreach (var item in seedItems)
            {
                bulkOps.Add(new UpdateOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                    Builders<BsonDocument>.Update
                        .Set("Ten", item.Ten)
                        .Set("MoTa", item.MoTa)
                        .Set("DanhSachCn", new BsonArray(item.DanhSachCn))
                        .Set("KichHoat", true)
                        .SetOnInsert("NguoiTao", "system")
                        .SetOnInsert("NgayTao", now)
                        .Set("NguoiSua", "system")
                        .Set("NgaySua", now))
                { IsUpsert = true });
            }

            if (bulkOps.Count > 0)
            {
                collection.BulkWrite(bulkOps);
            }

            Logger?.LogInformation("Ensured NhomChuyenNganh seed with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure NhomChuyenNganh seed");
            throw;
        }
    }

    private static void EnsureIndex(
        IMongoCollection<BsonDocument> collection,
        CreateIndexModel<BsonDocument> model)
    {
        var expectedKey = model.Keys.Render(
            new RenderArgs<BsonDocument>(
                collection.DocumentSerializer,
                collection.Settings.SerializerRegistry));

        var expectedName = model.Options?.Name;
        using var cursor = collection.Indexes.List();
        var existingIndexes = cursor.ToList();

        foreach (var existingIndex in existingIndexes)
        {
            var existingKey = existingIndex.GetValue("key", new BsonDocument()).AsBsonDocument;
            if (existingKey != expectedKey)
            {
                continue;
            }

            var existingName = existingIndex.GetValue("name", "").AsString;
            if (!string.Equals(existingName, expectedName, StringComparison.Ordinal))
            {
                Logger?.LogInformation(
                    "MongoDB index already exists on collection {CollectionName} with different name {ExistingName}; keeping existing index instead of creating {RequestedName}",
                    collection.CollectionNamespace.CollectionName,
                    existingName,
                    expectedName);
            }

            return;
        }

        collection.Indexes.CreateOne(model);
    }

    private static void EnsureCollectionExists(string collectionName)
    {
        var existing = MongoDB!.ListCollectionNames().ToList();
        if (existing.Contains(collectionName, StringComparer.Ordinal))
        {
            return;
        }

        MongoDB.CreateCollection(collectionName);
    }

    private static void EnsurePermissionCatalogSeed()
    {
        try
        {
            if (CollectionPermissionCatalog == null)
                return;

            var collection = CollectionPermissionCatalog;
            EnsureIndex(
                collection,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Code"),
                    new CreateIndexOptions { Name = "ux_permission_catalog_code", Unique = true }));

            var bulkOps = new List<WriteModel<BsonDocument>>();
            foreach (var group in PermissionCatalogSeed.Groups)
            {
                foreach (var permission in group.Permissions)
                {
                    bulkOps.Add(new UpdateOneModel<BsonDocument>(
                        Builders<BsonDocument>.Filter.Eq("Code", permission.Code),
                        Builders<BsonDocument>.Update
                            .Set("Code", permission.Code)
                            .Set("Name", permission.Name)
                            .Set("Group", group.Group)
                            .Set("Icon", group.Icon)
                            .Set("GroupOrder", group.Order)
                            .Set("Order", permission.Order)
                            .Set("Active", true))
                    { IsUpsert = true });
                }
            }

            if (bulkOps.Count > 0)
                collection.BulkWrite(bulkOps);

            Logger?.LogInformation("Ensured permission catalog seed with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure permission catalog seed");
            throw;
        }
    }

    private static void EnsureDynamicMenuPermissionCatalogSeed()
    {
        try
        {
            if (CollectionBsonDynamicMenu == null || CollectionPermissionCatalog == null)
                return;

            var menuDocs = CollectionBsonDynamicMenu
                .Find(MongoDocumentHelpers.NotDeleted)
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Title").Include("PermissionCode"))
                .ToList();

            if (menuDocs.Count == 0)
                return;

            var bulkOps = new List<WriteModel<BsonDocument>>();
            foreach (var menuDoc in menuDocs)
            {
                var menuId = menuDoc.GetValue("_id", "").ToString();
                if (string.IsNullOrWhiteSpace(menuId))
                    continue;

                var permissionCode = NormalizeDynamicMenuPermissionCode(
                    menuDoc.GetValue("PermissionCode", "").ToString(),
                    menuId);

                var title = menuDoc.GetValue("Title", menuId).ToString();
                bulkOps.Add(new UpdateOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("Code", permissionCode),
                    Builders<BsonDocument>.Update
                        .Set("Code", permissionCode)
                        .Set("Name", $"Truy cập menu: {title}")
                        .Set("Group", "Menu động")
                        .Set("Icon", "🧭")
                        .Set("GroupOrder", 70)
                        .Set("Order", 1000)
                        .Set("Active", true))
                { IsUpsert = true });

                CollectionBsonDynamicMenu.UpdateOne(
                    Builders<BsonDocument>.Filter.Eq("_id", menuId),
                    Builders<BsonDocument>.Update.Set("PermissionCode", permissionCode));
            }

            if (bulkOps.Count > 0)
                CollectionPermissionCatalog.BulkWrite(bulkOps);

            Logger?.LogInformation("Ensured dynamic menu permission catalog seed with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to ensure dynamic menu permission catalog seed");
            throw;
        }
    }

    private static string NormalizeDynamicMenuPermissionCode(string? rawValue, string fallbackId)
    {
        var normalized = (rawValue ?? string.Empty)
            .Trim()
            .ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalized))
            return $"dynamicmenu_{fallbackId}";

        var buffer = normalized
            .Select(ch => char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-' ? ch : '_')
            .ToArray();

        return new string(buffer).Trim('_');
    }

    private static void InitializeDefaultOffice()
    {
        try
        {
            var defaultId = "000";
            var filter = Builders<Office>.Filter.Eq(x => x.Id, defaultId);
            var existingOffice = CollectionOffice?.Find(filter).FirstOrDefault();

            var defaultOffice = new Office
            {
                Id = defaultId,
                Ten = "Bộ Quốc Phòng",
                TenDayDu = "Bộ Quốc Phòng",
                VietTat = "BQP",
                CoCapDuoi = true,
                ThuTu = 0,
                ThuTuSapXep = "000",
                Path = "/000/",
                Depth = 1,
                NgayTao = existingOffice?.NgayTao ?? ProtobufTimestampConverter.GetNowTimestamp(),
                NguoiTao = existingOffice?.NguoiTao ?? "System",
                NgaySua = ProtobufTimestampConverter.GetNowTimestamp(),
                NguoiSua = "System"
            };

            if (existingOffice == null)
            {
                CollectionOffice?.InsertOne(defaultOffice);
                Logger?.LogInformation("Created default Office with ID: {DefaultId}", defaultId);
            }
            else
            {
                CollectionOffice?.ReplaceOne(filter, defaultOffice);
                Logger?.LogInformation("Updated default Office with ID: {DefaultId}", defaultId);
            }
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Error initializing default Office");
        }
    }

    // ── Phân quyền: kiểm tra quyền truy cập phân hệ ─────────────────────
    public static bool CanAccessComponent(string userId, string maPhanHe)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;

        // 1. Kiểm tra quyền trực tiếp của user
        var phanHeNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenPhanHeNguoiDung");
        var phanHeNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                           & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe)
                           & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        if (phanHeNDCol.Find(phanHeNDFilter).Any())
            return true;

        // 2. Kiểm tra quyền từ nhóm
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var phanHeNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenPhanHeNhomNguoiDung");
        var phanHeNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                             & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe)
                             & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        return phanHeNhomCol.Find(phanHeNhomFilter).Any();
    }

    // ── Phân quyền: kiểm tra quyền thao tác chức năng (với MaPhanHe) ─────
    public static bool CanAccessComponentAction(string userId, string maPhanHe, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;

        // 1. Kiểm tra quyền trực tiếp của user
        var pqNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                       & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        // 2. Kiểm tra quyền từ nhóm
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                         & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // ── Overload: kiểm tra quyền thao tác (bất kỳ MaPhanHe) ──────────────
    public static bool CanAccessComponentAction(string userId, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;

        var pqNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // ── Helper: lấy danh sách nhóm (loại bỏ Delegated hết hạn) ───────────
    private static List<string> GetNhomIds(string userId)
    {
        var memberCol = MongoDB!.GetCollection<BsonDocument>("NguoiDungNhomNguoiDung");
        var memberFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId);
        var memberDocs = memberCol.Find(memberFilter).ToList();

        var nhomIds = new List<string>();
        foreach (var doc in memberDocs)
        {
            var st = doc.GetValue("ScopeType", BsonNull.Value);
            if (st != BsonNull.Value && st.AsString == "Delegated")
            {
                var hetHan = doc.GetValue("NgayHetHan", BsonNull.Value);
                if (hetHan != BsonNull.Value && hetHan.ToUniversalTime() < DateTime.UtcNow)
                    continue;
            }
            var nhomId = doc.GetValue("IdNhomNguoiDung", BsonNull.Value);
            if (nhomId != BsonNull.Value && !string.IsNullOrEmpty(nhomId.AsString))
                nhomIds.Add(nhomId.AsString);
        }
        return nhomIds;
    }

    // ── Helper: kiểm tra Actions có bất kỳ action nào = true ──────────────
    private static bool HasAnyAction(BsonDocument doc, string[] actions)
    {
        var actionsVal = doc.GetValue("Actions", BsonNull.Value);
        if (actionsVal == BsonNull.Value || !actionsVal.IsBsonDocument)
            return false;

        var a = actionsVal.AsBsonDocument;
        foreach (var action in actions)
        {
            if (a.GetValue(action, false).AsBoolean)
                return true;
        }
        return false;
    }
}
