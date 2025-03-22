// BOJ - 1920 수 찾기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 100001
 
using namespace std;

int arr[MAXN] = {0, }, n;
int binary_search(int k) {
    int s = 1, e = n;
    while(s <= e) {
        int m = (s + e) / 2;
        if(arr[m] == k) return 1;
        else if(arr[m] > k) e = m - 1;
        else s = m + 1;
    }
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 1, n) cin >> arr[i];
    sort(arr + 1, arr + n + 1);
    int m; cin >> m;
    loop(i, 1, m) {
        int k; cin >> k;
        cout << binary_search(k) << '\n';
    }
}