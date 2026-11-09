{
  description = "FAME — Recruitment Queue & Attribution Platform (ENSAM Meknès)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        python = pkgs.python312;
      in
      {
        formatter = pkgs.nixfmt-rfc-style;

        devShells.default = pkgs.mkShell {
          name = "fame-dev";
          buildInputs = [
            # Toolchain (dependencies themselves are pinned via uv.lock / package-lock.json)
            pkgs.uv
            pkgs.nodejs_22
            python
            # Local infrastructure / testing
            pkgs.docker
            pkgs.docker-compose
            pkgs.postgresql_16
            pkgs.redis
            pkgs.openssl
            pkgs.jq
          ];
          shellHook = ''
            echo "FAME development shell"
            echo "  backend  -> cd backend && uv sync"
            echo "  frontend -> cd fame-react && npm install"
            echo "  run      -> make up"
          '';
        };
      }
    );
}
