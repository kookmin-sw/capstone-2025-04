// BOJ - 15649 N과 M (1)

// 자연수 [1, N]에서 M개 고른 수열 -> Permutation
// dfs(layer): [layer, last layer)까지 나올 수 있는 수열 고르기

#include <iostream>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)

using namespace std;

int n, m, seq[9] = {0, };
void dfs(int cnt) {
    if(cnt == m) { // m개를 다 골랐다면
        LOOP(i, 0, cnt) cout << seq[i] << ' ';
        cout << '\n'; return;
    }
    loop(i, 1, n) {
        if((cnt && seq[cnt - 1] <= i) | !cnt) {
            seq[cnt] = i; // cnt번째 값은 i.
            dfs(cnt + 1);
        }
    }
}
int main() {
    cin.tie(0); ios::sync_with_stdio(false);

    cin >> n >> m; dfs(0);
}