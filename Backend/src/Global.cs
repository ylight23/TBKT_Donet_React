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
                _collectionEmployee = MongoDB?.GetCollection<Employee>(PermissionCollectionNames.Employees);
            return _collectionEmployee;

        }
    }
    private static IMongoCollection<Office>? _collectionOffice;

    public static IMongoCollection<Office>? CollectionOffice
    {
        get
        {
            if (_collectionOffice == null)
                _collectionOffice = MongoDB?.GetCollection<Office>(PermissionCollectionNames.Offices);
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
                _collectionBsonEmployee = MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.Employees);
            return _collectionBsonEmployee;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonOffice;
    public static IMongoCollection<BsonDocument>? CollectionBsonOffice
    {
        get
        {
            if (_collectionBsonOffice == null)
                _collectionBsonOffice = MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.Offices);
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


    // ThamSo collections (Using BsonDocument for manual mapping)
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

    // Collections quản lý quyền

    private static IMongoCollection<NhomNguoiDung>? _collectionNhomNguoiDung;
    public static IMongoCollection<NhomNguoiDung>? CollectionNhomNguoiDung
    {
        get
        {
            if (_collectionNhomNguoiDung == null)
                _collectionNhomNguoiDung = MongoDB?.GetCollection<NhomNguoiDung>(PermissionCollectionNames.Roles);
            return _collectionNhomNguoiDung;
        }
    }

    private static IMongoCollection<NguoiDungNhomNguoiDung>? _collectionNguoiDungNhomNguoiDung;
    public static IMongoCollection<NguoiDungNhomNguoiDung>? CollectionNguoiDungNhomNguoiDung
    {
        get
        {
            if (_collectionNguoiDungNhomNguoiDung == null)
                _collectionNguoiDungNhomNguoiDung = MongoDB?.GetCollection<NguoiDungNhomNguoiDung>(PermissionCollectionNames.UserRoleAssignments);
            return _collectionNguoiDungNhomNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNguoiDung>? _collectionPhanQuyenPhanHeNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNguoiDung>? CollectionPhanQuyenPhanHeNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNguoiDung == null)
                _collectionPhanQuyenPhanHeNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNguoiDung>(PermissionCollectionNames.UserSubsystemPermissions);
            return _collectionPhanQuyenPhanHeNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? _collectionPhanQuyenPhanHeNhomNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? CollectionPhanQuyenPhanHeNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNhomNguoiDung == null)
                _collectionPhanQuyenPhanHeNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNhomNguoiDung>(PermissionCollectionNames.GroupSubsystemPermissions);
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
                _collectionPhanQuyenNguoiDung = MongoDB?.GetCollection<PhanQuyenNguoiDung>(PermissionCollectionNames.UserPermissionOverrides);
            return _collectionPhanQuyenNguoiDung;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNguoiDungBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNguoiDungBson
    {
        get
        {
            if (_collectionPhanQuyenNguoiDungBson == null)
                _collectionPhanQuyenNguoiDungBson = MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionOverrides);
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
                _collectionPhanQuyenNhomNguoiDungBson = MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.RolePermissions);
            return _collectionPhanQuyenNhomNguoiDungBson;
        }
    }

    private static IMongoCollection<PhanQuyenNhomNguoiDung>? _collectionPhanQuyenNhomNguoiDung;
    public static IMongoCollection<PhanQuyenNhomNguoiDung>? CollectionPhanQuyenNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDung == null)
                _collectionPhanQuyenNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenNhomNguoiDung>(PermissionCollectionNames.RolePermissions);
            return _collectionPhanQuyenNhomNguoiDung;
        }
    }

    private static IMongoCollection<RelationShipObject>? _collectionRelationShipObject;
    public static IMongoCollection<RelationShipObject> CollectionRelationShipObject
    {
        get
        {
            if (_collectionRelationShipObject == null)
                _collectionRelationShipObject = MongoDB?.GetCollection<RelationShipObject>("RelationShipObjects");
            return _collectionRelationShipObject!;
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

    private static IMongoCollection<BsonDocument>? _collectionStoredFile;
    public static IMongoCollection<BsonDocument>? CollectionStoredFile
    {
        get
        {
            if (_collectionStoredFile == null)
                _collectionStoredFile = MongoDB?.GetCollection<BsonDocument>("StoredFile");
            return _collectionStoredFile;
        }
    }

    public static void UseTBKTServices(this WebApplication app, IConfiguration config, string version)
    {
        // Initialize global logger
        Logger = app.Services.GetRequiredService<ILogger<object>>();
        PermissionCollectionNames.Initialize(Logger);

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
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSourceField>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSource>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenu>());
        BsonSerializer.RegisterSerializer(new MapFieldSerializer<string, bool>());

        // ThamSo BsonClassMap
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

        // â”€â”€ Permission model BsonClassMaps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        if (!BsonClassMap.IsClassMapRegistered(typeof(CatalogTree)))
        {
            BsonClassMap.RegisterClassMap<CatalogTree>(c =>
            {
                c.AutoMap();
                c.SetIgnoreExtraElements(true);
                c.MapIdProperty(x => x.Id);
            });
        }

        InitOfficeSchema();
        InitTrangBiCatalogIndexes();
        InitThamSoIndexes();
        InitPhanQuyenIndexes();
        InitFileTransferSchema();
        SeedSsoIdentityMappings();
        SeedDanhMucChuyenNganh();
        SeedPermissionCatalog();
        SeedDynamicMenuPermissions();

        // Initialize default Office item with ID "000"
        InitializeDefaultOffice();

        app.MapGrpcService<EmployeeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<OfficeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<CatalogServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<ThamSoServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<PhanQuyenServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<DanhMucChuyenNganhServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<LichSuPhanQuyenScopeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<FileTransferServiceImpl>().EnableGrpcWeb().RequireAuthorization();

        app.UseStaticFiles(new StaticFileOptions
        {
            ServeUnknownFileTypes = true,
            DefaultContentType = "application/octet-stream"
        });
        app.UseRouting();
        app.MapControllers();
        app.MapFallbackToFile("index.html");



    }

    private static void InitThamSoIndexes()
    {
        try
        {
            if (CollectionBsonDynamicMenuDataSource != null)
            {
                CreateMongoIndex(
                    CollectionBsonDynamicMenuDataSource,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("SourceKey")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_menu_datasource_sourcekey_delete" }));
            }

            if (CollectionBsonDynamicMenu != null)
            {
                CreateMongoIndex(
                    CollectionBsonDynamicMenu,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("DataSource")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_menu_datasource_delete" }));
            }

            if (CollectionBsonDynamicField != null)
            {
                CreateMongoIndex(
                    CollectionBsonDynamicField,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys
                            .Ascending("Validation.DataSource")
                            .Ascending("Delete"),
                        new CreateIndexOptions { Name = "idx_thamso_dynamic_field_validation_datasource_delete" }));
            }

            if (CollectionBsonFieldSet != null)
            {
                CreateMongoIndex(
                    CollectionBsonFieldSet,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys.Ascending("FieldIds"),
                        new CreateIndexOptions { Name = "idx_thamso_fieldset_fieldids" }));
            }

            if (CollectionBsonFormConfig != null)
            {
                CreateMongoIndex(
                    CollectionBsonFormConfig,
                    new CreateIndexModel<BsonDocument>(
                        Builders<BsonDocument>.IndexKeys.Ascending("Tabs.FieldSetIds"),
                        new CreateIndexOptions { Name = "idx_thamso_formconfig_tabs_fieldsetids" }));
            }

            Logger?.LogInformation("Initialized MongoDB indexes for ThamSo collections");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to initialize MongoDB indexes for ThamSo collections");
            throw;
        }
    }

    private static void InitOfficeSchema()
    {
        try
        {
            CreateCollectionIfNotExist("DanhMucChuyenNganh");

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Path"),
                    new CreateIndexOptions { Name = "idx_office_path" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Depth"),
                    new CreateIndexOptions { Name = "idx_office_depth" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdCapTren"),
                    new CreateIndexOptions { Name = "idx_office_parent" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.Offices),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys
                        .Ascending("Parameters.Name")
                        .Ascending("Parameters.StringValue"),
                    new CreateIndexOptions { Name = "idx_office_parameter_name_stringvalue", Sparse = true }));

            Logger?.LogInformation("Initialized MongoDB schema and indexes for Office");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to initialize MongoDB schema and indexes for Office");
            throw;
        }
    }

    private static void InitTrangBiCatalogIndexes()
    {
        try
        {
            const string collectionName = "DanhMucTrangBi";
            CreateCollectionIfNotExist(collectionName);

            var collection = MongoDB!.GetCollection<BsonDocument>(collectionName);

            CreateMongoIndex(
                collection,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdChuyenNganhKT"),
                    new CreateIndexOptions { Name = "idx_trangbi_cn" }));

            CreateMongoIndex(
                collection,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdCapTren"),
                    new CreateIndexOptions { Name = "idx_trangbi_parent" }));

            CreateMongoIndex(
                collection,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys
                        .Ascending("IdChuyenNganhKT")
                        .Ascending("IdCapTren")
                        .Ascending("ThuTuSapXep"),
                    new CreateIndexOptions { Name = "idx_trangbi_cn_parent_sort" }));

            Logger?.LogInformation("Initialized MongoDB indexes for DanhMucTrangBi");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to initialize MongoDB indexes for DanhMucTrangBi");
            throw;
        }
    }

    private static void InitPhanQuyenIndexes()
    {
        try
        {
            CreateCollectionIfNotExist(PermissionCollectionNames.SsoIdentityMappings);
            CreateCollectionIfNotExist(PermissionCollectionNames.AuthzAuditLogs);

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_user" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_group" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdDonViUyQuyenQT"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_anchor", Sparse = true }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("NgayHetHan"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_expire", Sparse = true }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNganhDoc"),
                    new CreateIndexOptions { Name = "idx_phanquyen_assignment_multinode" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_user_subsystem_user_module" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_group_subsystem_group_module" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionOverrides),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_user_function_user_module" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.RolePermissions),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNhomNguoiDung").Ascending("MaPhanHe"),
                    new CreateIndexOptions { Name = "idx_phanquyen_group_function_group_module" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiDuocPhanQuyen").Descending("NgayThucHien"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_target_time_desc" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("IdNguoiThucHien").Descending("NgayThucHien"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_actor_time_desc" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>("LichSuPhanQuyenScope"),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("NgayHetHanMoi"),
                    new CreateIndexOptions { Name = "idx_lichsu_scope_expire_new", Sparse = true }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.SsoIdentityMappings),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Provider").Ascending("Subject"),
                    new CreateIndexOptions<BsonDocument>
                    {
                        Name = "ux_sso_identity_provider_subject",
                        Unique = true,
                        PartialFilterExpression = Builders<BsonDocument>.Filter.And(
                            Builders<BsonDocument>.Filter.Exists("Provider", true),
                            Builders<BsonDocument>.Filter.Type("Provider", BsonType.String),
                            Builders<BsonDocument>.Filter.Exists("Subject", true),
                            Builders<BsonDocument>.Filter.Type("Subject", BsonType.String))
                    }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.SsoIdentityMappings),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("UserName"),
                    new CreateIndexOptions<BsonDocument>
                    {
                        Name = "ux_sso_identity_username",
                        Unique = true,
                        PartialFilterExpression = Builders<BsonDocument>.Filter.And(
                            Builders<BsonDocument>.Filter.Exists("UserName", true),
                            Builders<BsonDocument>.Filter.Type("UserName", BsonType.String))
                    }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.SsoIdentityMappings),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("EmployeeId"),
                    new CreateIndexOptions { Name = "idx_sso_identity_employee" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.AuthzAuditLogs),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("EventType").Descending("At"),
                    new CreateIndexOptions { Name = "idx_authz_audit_event_time_desc" }));

            CreateMongoIndex(
                MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.AuthzAuditLogs),
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("UserId").Descending("At"),
                    new CreateIndexOptions { Name = "idx_authz_audit_user_time_desc" }));

            Logger?.LogInformation("Initialized MongoDB indexes for PhanQuyen collections");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to initialize MongoDB indexes for PhanQuyen collections");
            throw;
        }
    }

    private static void InitFileTransferSchema()
    {
        try
        {
            CreateCollectionIfNotExist("StoredFile");

            if (CollectionStoredFile == null)
                return;

            CreateMongoIndex(
                CollectionStoredFile,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("UploadId"),
                    new CreateIndexOptions { Name = "ux_stored_file_upload_id", Unique = true }));

            CreateMongoIndex(
                CollectionStoredFile,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Completed").Ascending("Delete"),
                    new CreateIndexOptions { Name = "idx_stored_file_completed_delete" }));

            CreateMongoIndex(
                CollectionStoredFile,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("Category").Ascending("FileKind"),
                    new CreateIndexOptions { Name = "idx_stored_file_category_kind" }));

            CreateMongoIndex(
                CollectionStoredFile,
                new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending("ContentType"),
                    new CreateIndexOptions { Name = "idx_stored_file_content_type" }));

            Logger?.LogInformation("Initialized MongoDB schema and indexes for FileTransfer");
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to initialize MongoDB schema and indexes for FileTransfer");
            throw;
        }
    }

    private static void SeedDanhMucChuyenNganh()
    {
        try
        {
            var collection = MongoDB!.GetCollection<BsonDocument>("DanhMucChuyenNganh");
            var now = DateTime.UtcNow;
            var creatorId = "304b79d6-aa43-4ea8-b4ed-5fe68538a014";

            var seedItems = new[]
            {
                new { Id = "T",  Ten = "Xe Máy", VietTat = (string?)null, ThuTu = 1 },
                new { Id = "B",  Ten = "Tàu thuyền", VietTat = (string?)null, ThuTu = 2 },
                new { Id = "O",  Ten = "Thông tin", VietTat = (string?)null, ThuTu = 3 },
                new { Id = "I",  Ten = "Ra đa", VietTat = (string?)null, ThuTu = 4 },
                new { Id = "G",  Ten = "Tăng Thiết giáp", VietTat = (string?)"TTG", ThuTu = 5 },
                new { Id = "A",  Ten = "Máy bay", VietTat = (string?)null, ThuTu = 6 },
                new { Id = "C",  Ten = "Tên lửa", VietTat = (string?)null, ThuTu = 7 },
                new { Id = "D1", Ten = "Súng pháo", VietTat = (string?)null, ThuTu = 8 },
                new { Id = "D2", Ten = "KTĐTQH", VietTat = (string?)null, ThuTu = 9 },
                new { Id = "D3", Ten = "Trang bị nước", VietTat = (string?)"T.Bị nước", ThuTu = 10 },
                new { Id = "D4", Ten = "Công cụ hỗ trợ", VietTat = (string?)"CC hỗ trợ", ThuTu = 11 },
                new { Id = "E",  Ten = "Đạn dược", VietTat = (string?)null, ThuTu = 12 },
                new { Id = "H",  Ten = "Tác chiến điện tử", VietTat = (string?)"TCĐT", ThuTu = 13 },
                new { Id = "K",  Ten = "Công nghệ thông tin - Không gian mạng", VietTat = (string?)"CNTT", ThuTu = 14 },
                new { Id = "M",  Ten = "Công binh", VietTat = (string?)null, ThuTu = 15 },
                new { Id = "N",  Ten = "Hóa học", VietTat = (string?)null, ThuTu = 16 },
                new { Id = "P",  Ten = "Cơ yếu", VietTat = (string?)null, ThuTu = 17 },
                new { Id = "R",  Ten = "Đo lường", VietTat = (string?)null, ThuTu = 18 },
                new { Id = "Q",  Ten = "Biên phòng", VietTat = (string?)null, ThuTu = 19 },
                new { Id = "S",  Ten = "Bản đồ", VietTat = (string?)null, ThuTu = 20 },
                new { Id = "F",  Ten = "Dùng chung", VietTat = (string?)"D.Chung", ThuTu = 21 },
                new { Id = "L",  Ten = "TBTS", VietTat = (string?)"TBTS", ThuTu = 22 },
            };

            var bulkOps = new List<WriteModel<BsonDocument>>();
            foreach (var item in seedItems)
            {
                bulkOps.Add(new UpdateOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                    Builders<BsonDocument>.Update
                        .Set("Ten", item.Ten)
                        .Set("VietTat", (BsonValue)item.VietTat ?? BsonNull.Value)
                        .Set("ThuTu", item.ThuTu)
                        .SetOnInsert("NguoiTao", creatorId)
                        .SetOnInsert("NgayTao", now)
                        .Set("NguoiSua", creatorId)
                        .Set("NgaySua", now))
                { IsUpsert = true });
            }

            if (bulkOps.Count > 0)
            {
                collection.BulkWrite(bulkOps);
            }

            Logger?.LogInformation("Seeded DanhMucChuyenNganh with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to seed DanhMucChuyenNganh");
            throw;
        }
    }

    private static void CreateMongoIndex(
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

    private static void CreateCollectionIfNotExist(string collectionName)
    {
        var existing = MongoDB!.ListCollectionNames().ToList();
        if (existing.Contains(collectionName, StringComparer.Ordinal))
        {
            return;
        }

        MongoDB.CreateCollection(collectionName);
    }

    private static void SeedPermissionCatalog()
    {
        try
        {
            if (CollectionPermissionCatalog == null)
                return;

            var collection = CollectionPermissionCatalog;
            CreateMongoIndex(
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

            Logger?.LogInformation("Seeded permission catalog with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to seed permission catalog");
            throw;
        }
    }

    private static void SeedDynamicMenuPermissions()
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
                        .Set("Name", $"Truy câp menu: {title}")
                        .Set("Group", "Menu động")
                        .Set("Icon", "IconMenu")
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

            Logger?.LogInformation("Seeded dynamic menu permissions with {Count} items", bulkOps.Count);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to seed dynamic menu permissions");
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

    private static void SeedSsoIdentityMappings()
    {
        try
        {
            var collection = MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.SsoIdentityMappings);
            if (collection == null)
                return;

            var now = DateTime.UtcNow;
            var seedItems = new[]
            {
                new { UserName = "admin", Role = "admin", Provider = "local", Issuer = "local", Subject = "admin" },
                new { UserName = "superadmin", Role = "admin", Provider = "local", Issuer = "local", Subject = "superadmin" },
            };

            var bulkOps = new List<WriteModel<BsonDocument>>();
            foreach (var item in seedItems)
            {
                bulkOps.Add(new UpdateOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("UserName", item.UserName),
                    Builders<BsonDocument>.Update
                        .Set("UserName", item.UserName)
                        .Set("Provider", item.Provider)
                        .Set("Issuer", item.Issuer)
                        .Set("Subject", item.Subject)
                        .Set("Role", item.Role)
                        .Set("Active", true)
                        .Set("LastLoginAt", BsonNull.Value)
                        .SetOnInsert("EmployeeId", BsonNull.Value)
                        .SetOnInsert("CreatedAt", now)
                        .Set("UpdatedAt", now))
                { IsUpsert = true });
            }

            if (bulkOps.Count > 0)
                collection.BulkWrite(bulkOps);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Failed to seed SSO identity mappings");
            throw;
        }
    }

    public const string UnifiedMaPhanHe = "TBKT.ThongTin";

    public static string NormalizeMaPhanHe(string? maPhanHe)
    {
        if (string.IsNullOrWhiteSpace(maPhanHe))
            return "";

        return UnifiedMaPhanHe;
    }

    // Phan quyen: Kiem tra quyen truy cap phan mem
    public static bool CanAccessComponent(string userId, string maPhanHe)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        var normalizedMaPhanHe = NormalizeMaPhanHe(maPhanHe);
        if (string.IsNullOrEmpty(normalizedMaPhanHe)) return false;

        // 1. Kiem tra quyen truy cap cua user
        var phanHeNDCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions);
        var phanHeNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                           & Builders<BsonDocument>.Filter.Eq("MaPhanHe", normalizedMaPhanHe)
                           & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        if (phanHeNDCol.Find(phanHeNDFilter).Any())
            return true;

        // 2. Kiem tra quyen truy cap cua nhom
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var phanHeNhomCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions);
        var phanHeNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                             & Builders<BsonDocument>.Filter.Eq("MaPhanHe", normalizedMaPhanHe)
                             & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        return phanHeNhomCol.Find(phanHeNhomFilter).Any();
    }

    // Phan quyen: Kiem tra quyen thao tac cua chuc nang (voi MaPhanHe)
    public static bool CanAccessComponentAction(string userId, string maPhanHe, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;
        var normalizedMaPhanHe = NormalizeMaPhanHe(maPhanHe);
        if (string.IsNullOrEmpty(normalizedMaPhanHe)) return false;

        // 1. Kiem tra quyen truy cap cua user
        var pqNDCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionOverrides);
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                       & Builders<BsonDocument>.Filter.Eq("MaPhanHe", normalizedMaPhanHe);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        // 2. Kiem tra quyen truy cap cua nhom
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.RolePermissions);
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                         & Builders<BsonDocument>.Filter.Eq("MaPhanHe", normalizedMaPhanHe);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // Overload: Kiem tra quyen thao tac (bat ky MaPhanHe)
    public static bool CanAccessComponentAction(string userId, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;

        var pqNDCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionOverrides);
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>(PermissionCollectionNames.RolePermissions);
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // Helper: lay danh sach nhom (loai biet Delegated het han)
    private static List<string> GetNhomIds(string userId)
    {
        var memberCol = MongoDB!.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments);
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

    // Helper: kiem tra Actions co bat ky action nao = true
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
