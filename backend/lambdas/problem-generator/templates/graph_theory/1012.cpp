#include <stdio.h>
#include <memory.h>

const int dx[] = { 0,0,-1,1 };
const int dy[] = { -1,1,0,0 };

int tc, n, m, k, i, j, x, y, ans;
bool farm[52][52];

void dfs(int x, int y) {
	farm[x][y] = 0;
	for (int i = 0; i < 4; i++)
		if (farm[x + dx[i]][y + dy[i]]) dfs(x + dx[i], y + dy[i]);
}

int main() {
	scanf("%d", &tc);

	while (tc--) {
		ans = 0, memset(farm, 0, sizeof(farm));
		scanf("%d %d %d", &n, &m, &k);
		while (k--) {
			scanf("%d %d", &x, &y);
			farm[++x][++y] = 1;
		}
		for (i = 1; i <= n; i++)
			for (j = 1; j <= m; j++)
				if (farm[i][j]) ans++, dfs(i, j);
		printf("%d\n", ans);
	}

	return 0;
}