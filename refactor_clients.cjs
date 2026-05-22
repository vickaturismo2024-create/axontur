const fs = require('fs');
const file = 'src/pages/Clients.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const return1 = `return (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">

      {/* Encabezado */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground flex items-center gap-2 sm:text-3xl">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" /> Clientes
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
              Gestioná tus clientes, importá desde Excel y organizalos en grupos
            </p>
          </div>
          {/* Botones — 2x2 en mobile, fila en desktop */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
            {clients.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            )}
            <Button size="sm" onClick={handleNew} className="col-span-2 sm:col-span-1 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="clients">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="clients" className="flex-1 sm:flex-none">
            Clientes ({clients.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 sm:flex-none">
            Grupos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4 sm:mt-6">
          {/* Alerta documentos */}
          {docAlerts.total > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950 sm:items-center sm:gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5 sm:mt-0 sm:h-5 sm:w-5" />
              <p className="text-xs flex-1 sm:text-sm">
                {docAlerts.expired > 0 && (
                  <span className="font-semibold text-destructive">{docAlerts.expired} vencido(s)</span>
                )}
                {docAlerts.expired > 0 && docAlerts.expiring > 0 && ' · '}
                {docAlerts.expiring > 0 && (
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                    {docAlerts.expiring} por vencer
                  </span>
                )}
              </p>
              <Button
                variant={docFilter ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-7 text-xs sm:h-8 sm:text-sm"
                onClick={() => setDocFilter(!docFilter)}
              >
                <ShieldAlert className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {docFilter ? 'Todos' : 'Filtrar'}
              </Button>
            </div>
          )}

          {/* Buscador */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, teléfono o DNI..."
                className="pl-10 h-9 sm:h-10"
              />
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-2 sm:space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-56 sm:w-72" />
                      </div>
                      <Skeleton className="h-6 w-16 sm:w-20" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="py-10 text-center sm:py-12">
              <CardContent>
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50 sm:h-12 sm:w-12" />
                <p className="mt-3 text-sm text-muted-foreground sm:mt-4">
                  {search
                    ? 'No se encontraron clientes'
                    : 'Aún no tenés clientes. ¡Creá el primero o importá desde Excel!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2 sm:space-y-3">
                {paginated.map(client => (
                  <ExpandableClientCard
                    key={client.id}
                    client={client}
                    quotes={getClientQuotes(client)}
                    onEdit={() => handleEdit(client)}
                    onDelete={() => setDeleteTargetId(client.id)}
                    navigate={navigate}
                    defaultOpen={!!highlightName && client.name === highlightName}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-2 sm:mt-6">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Pág. {currentPage}/{totalPages} · {filtered.length} clientes
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="h-8 px-2 sm:px-3"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 px-2 sm:px-3"
                    >
                      <span className="hidden sm:inline mr-1">Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="groups" className="mt-4 sm:mt-6">
          <GroupsManager clients={clients} />
        </TabsContent>
      </Tabs>
    </main>

    <ClientFormDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      client={editingClient}
      onClientChange={setEditingClient}
      onSave={handleSave}
    />

    <ImportExcelDialog
      open={isImportOpen}
      onOpenChange={setIsImportOpen}
      onImport={handleBulkImportDone}
      existingDnis={existingDnis}
    />

    <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
      <AlertDialogContent className="mx-3 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);`;

const return2 = `return (
  <Collapsible open={open} onOpenChange={setOpen}>
    <Card ref={cardRef} className={defaultOpen ? 'ring-2 ring-primary' : ''}>

      {/* Header expandible */}
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer pb-2 hover:bg-muted/50 transition-colors px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {open
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{client.name}</CardTitle>
              {/* Datos de contacto — ocultos en mobile si hay badges */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground sm:text-sm sm:mt-1">
                {client.dni && (
                  <span className="hidden sm:flex items-center gap-1">
                    <FileText className="h-3 w-3" />DNI: {client.dni}
                  </span>
                )}
                {client.email && (
                  <span className="hidden sm:flex items-center gap-1 max-w-[200px] truncate">
                    <Mail className="h-3 w-3 shrink-0" />{client.email}
                  </span>
                )}
                {(client.phone || client.phone_mobile) && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {client.phone_mobile || client.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Badges — compactos en mobile */}
            <div className="flex items-center gap-1 shrink-0 sm:gap-2">
              <DocumentAlertBadge label="DNI" dateStr={client.dni_expiry} compact />
              <DocumentAlertBadge label="Pas." dateStr={client.passport_expiry} compact />
              {quotes.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 sm:text-xs sm:px-2">
                  {quotes.length}p
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </CollapsibleTrigger>

      {/* Contenido expandido */}
      <CollapsibleContent>
        <CardContent className="pt-0 pb-3 px-3 space-y-3 sm:pb-4 sm:px-6 sm:space-y-4">

          {/* Datos personales */}
          <div className="rounded-md border p-2 sm:p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Datos personales
            </p>
            {/* 1 col mobile, 2 tablet, 3 desktop */}
            <div className="grid grid-cols-1 gap-y-1 gap-x-4 sm:grid-cols-2 md:grid-cols-3">
              {detail('Dirección',    client.address)}
              {detail('Localidad',   client.locality)}
              {detail('Nac.',        client.nationality)}
              {detail('Fecha Nac.',  client.birth_date)}
              {detail('Sexo',        client.sex)}
              {detail('CUIL/CUIT',   client.cuil_cuit)}
              {detail('DNI',         client.dni)}
              {detail('Vto. DNI',    client.dni_expiry)}
              {detail('Pasaporte',   client.passport)}
              {detail('Emisión Pas.',client.passport_issue)}
              {detail('Vto. Pas.',   client.passport_expiry)}
              {detail('Tel. Part.',  client.phone)}
              {detail('Tel. Com.',   client.phone_work)}
              {detail('Celular',     client.phone_mobile)}
            </div>
            {client.notes && (
              <p className="text-xs text-muted-foreground mt-2">📝 {client.notes}</p>
            )}
          </div>

          {/* Tabs presupuestos / expedientes */}
          {(quotes.length > 0 || (filesLoaded && files.length > 0)) && (
            <Tabs defaultValue="quotes" className="rounded-md border p-2 sm:p-3">
              <TabsList className="mb-2 w-full sm:w-auto">
                <TabsTrigger value="quotes" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Presupuestos ({quotes.length})
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Expedientes ({files.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quotes">
                <div className="flex flex-wrap gap-1 mb-2">
                  {QUOTE_FILTERS.map(f => {
                    const count = quoteCountByFilter(f.key);
                    return (
                      <Button
                        key={f.key}
                        variant={quoteFilter === f.key ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-[10px] px-2 sm:h-7 sm:text-xs sm:px-3"
                        onClick={() => setQuoteFilter(f.key)}
                      >
                        {f.label}
                        {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                      </Button>
                    );
                  })}
                </div>
                {filteredQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Sin presupuestos en esta categoría
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto sm:max-h-60">
                    {filteredQuotes.map(q => (
                      <button
                        key={q.id}
                        onClick={() => navigate(\`/quote/\${q.id}\`)}
                        className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none">
                            {q.trip.destination || 'Sin destino'}
                          </span>
                          <Badge
                            variant={STATUS_COLORS[q.status || 'draft'] || 'secondary'}
                            className="text-[9px] px-1 sm:text-[10px]"
                          >
                            {STATUS_LABELS[q.status || 'draft'] || q.status}
                          </Badge>
                        </div>
                        <span className="text-xs font-medium shrink-0 ml-2">
                          {(q.trip as any).currency || 'USD'} {(q.pricing.totalPrice || 0).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files">
                <div className="flex flex-wrap gap-1 mb-2">
                  {FILE_FILTERS.map(f => {
                    const count = fileCountByFilter(f.key);
                    return (
                      <Button
                        key={f.key}
                        variant={fileFilter === f.key ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-[10px] px-2 sm:h-7 sm:text-xs sm:px-3"
                        onClick={() => setFileFilter(f.key)}
                      >
                        {f.label}
                        {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                      </Button>
                    );
                  })}
                </div>
                {filteredFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Sin expedientes en esta categoría
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto sm:max-h-60">
                    {filteredFiles.map(f => (
                      <button
                        key={f.id}
                        onClick={() => navigate(\`/files/\${f.id}\`)}
                        className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
                          <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-mono shrink-0">
                            FILE-{String(f.file_number).padStart(3, '0')}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                            {f.destination}
                          </span>
                          <Badge
                            variant={STATUS_COLORS[f.status] || 'secondary'}
                            className="text-[9px] px-1 sm:text-[10px] shrink-0"
                          >
                            {STATUS_LABELS[f.status] || f.status}
                          </Badge>
                        </div>
                        {f.start_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-2">
                            <Calendar className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {new Date(f.start_date).toLocaleDateString('es-AR')}
                            </span>
                            <span className="sm:hidden">
                              {new Date(f.start_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Acciones */}
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 text-xs sm:px-3 sm:text-sm">
              <Pencil className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(\`/clients/\${client.id}\`)}
              className="h-8 px-2 text-xs sm:px-3 sm:text-sm"
            >
              <Wallet className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Cuenta
            </Button>
            <AdminOnly>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 px-2 text-destructive sm:px-3"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </AdminOnly>
          </div>
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
);`;

// Regex matching
const ret1Regex = /return \(\n\s*<div className="min-h-screen bg-background">[\s\S]*?\n\s*\);\n};/m;
const ret2Regex = /return \(\n\s*<Collapsible open={open} onOpenChange={setOpen}>[\s\S]*?\n\s*\);\n}/m;

content = content.replace(ret2Regex, return2 + '\n}');
content = content.replace(ret1Regex, return1 + '\n};');

fs.writeFileSync(file, content);
console.log('Done!');
