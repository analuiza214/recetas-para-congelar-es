param([ValidateSet('test','live')][string]$Mode = 'test')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetFile = Join-Path $projectRoot '.dev.vars'
if (Test-Path -LiteralPath $targetFile) {
    throw 'O arquivo .dev.vars já existe. Preserve as configurações e edite apenas as variáveis Stripe.'
}
function Read-StripeValue([string]$Label, [string]$Pattern) {
    $secureValue = Read-Host $Label -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ($plainValue -notmatch $Pattern) { throw 'Formato de chave inválido para este ambiente.' }
        return $plainValue
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}
$publishableKey = Read-StripeValue 'Chave publicável Stripe' ('^pk_' + $Mode + '_[A-Za-z0-9]+$')
$secretKey = Read-StripeValue 'Chave secreta ou restrita Stripe' ('^(sk|rk)_' + $Mode + '_[A-Za-z0-9]+$')
$webhookSecret = Read-StripeValue 'Segredo de assinatura do webhook' '^whsec_[A-Za-z0-9]+$'
$content = @(
    'STRIPE_MODE="' + $Mode + '"'
    'STRIPE_PUBLISHABLE_KEY="' + $publishableKey + '"'
    'STRIPE_SECRET_KEY="' + $secretKey + '"'
    'STRIPE_WEBHOOK_SECRET="' + $webhookSecret + '"'
)
[IO.File]::WriteAllLines($targetFile, $content, [Text.UTF8Encoding]::new($false))
$publishableKey = $null
$secretKey = $null
$webhookSecret = $null
$content = $null
Write-Host 'Configuração local salva. Cadastre as variáveis de produção no Worker Cloudflare correspondente.'
